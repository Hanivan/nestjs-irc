HELP_CMD = grep -E '^[a-zA-Z_-]+:.*?\#\# .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?\#\# "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
SHELL := bash
SHELL_VERSION = $(shell echo $$BASH_VERSION)
PACKAGE_COUNT = $(shell dpkg-query -f '${binary:Package}\n' -W | wc -l)
RAM_COUNT = $(shell grep MemTotal /proc/meminfo | awk '{printf "%.0fG\n", $2/1024/1024}')
DISK_COUNT = $(shell df -h / | awk 'NR==2 {print $2}')
UNAME := $(shell uname -s)
VERSION_AND_ARCH = $(shell uname -rm)
ARCH = $(shell dpkg --print-architecture)
CODENAME = $(shell lsb_release -cs)

ifeq ($(UNAME),Darwin)
		OS = macos ${VERSION_AND_ARCH}
else ifeq ($(UNAME),Linux)
		OS = linux ${VERSION_AND_ARCH}
else
		$(error OS not supported by this Makefile)
endif

.DEFAULT_GOAL := help
.PHONY: help about install_kubernetes reset_kubernetes_plane reset_kubernetes_worker install_helm install_docker post_install_docker

help: ## Show this help
		@${HELP_CMD}

about: ## Display info related to the build
		@echo "OS/Kernel: ${OS}"
		@echo "Shell: ${SHELL} ${SHELL_VERSION}"
		@echo "RAM: ${RAM_COUNT}"
		@echo "Disk: ${DISK_COUNT}"
		@echo "Installed Package: ${PACKAGE_COUNT}"

bootstrap: ## Bootstrap required dependencies
		@echo "Disabling swap..."
		sudo swapoff -a
		@echo "Loading necessary kernel modules..."
		sudo modprobe br_netfilter
		sudo modprobe overlay

		@echo "Configuring modules to load on boot..."
		echo -e "overlay\nbr_netfilter" | sudo tee /etc/modules-load.d/k8s.conf > /dev/null

		@echo "Installing etcd server and client..."
		sudo apt install etcd-server etcd-client -y
		sudo systemctl enable --now etcd

		@echo "Configuring sysctl settings for Kubernetes..."
		echo -e "net.bridge.bridge-nf-call-ip6tables = 1\nnet.bridge.bridge-nf-call-iptables = 1\nnet.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/kubernetes.conf > /dev/null
		sudo sysctl --system

		@echo "Setting up containerd..."
		containerd config default | sudo tee /etc/containerd/config.toml > /dev/null
		sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/g' /etc/containerd/config.toml

		@echo "Restarting containerd service..."
		sudo service containerd restart
		sudo systemctl stop apparmor 
		sudo systemctl disable apparmor 

install_helm: ## Install Helm
		curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

install_kdash: ## Install KDash (A simple terminal dashboard for Kubernetes built with Rust)
		sudo apt install libc6 libc6-dev -y;
		curl https://raw.githubusercontent.com/kdash-rs/kdash/main/deployment/getLatest.sh | sudo bash

install_docker: ## Install Docker
		# Remove any existing Docker packages
		for PKG in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do sudo apt remove $(PKG) -y || true; done

		# Update package index
		sudo apt update -y || (echo "Error: apt update failed" && exit 100)

		# Install required dependencies
		sudo apt install -y ca-certificates curl wget git || (echo "Error: failed to install dependencies" && exit 100)

		# Set up Docker's official GPG key
		sudo install -m 0755 -d /etc/apt/keyrings || (echo "Error: failed to create keyring directory" && exit 100)
		sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc || (echo "Error: failed to download Docker GPG key" && exit 100)
		sudo chmod a+r /etc/apt/keyrings/docker.asc || (echo "Error: failed to set permissions on GPG key" && exit 100)

		# Add Docker's repository with proper architecture
		echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${CODENAME} stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

		# Update package index with the new Docker repo
		sudo apt update -y || (echo "Error: failed to update after adding Docker repository" && exit 100)

		# Install Docker components
		sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin || (echo "Error: Docker installation failed" && exit 100)

post_install_docker: ## Add user to docker group
		sudo groupadd docker || (echo "Error: failed to add docker group" && exit 100);
		sudo usermod -aG docker $(USER) || true;

install_kubernetes: ## Install Kubernetes (k8s)
		sudo apt update -y;
		sudo apt install socat netcat-openbsd apt-transport-https ca-certificates curl gpg -y;

		curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.31/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg;

		echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.31/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list;

		sudo apt update -y;
		sudo apt install kubelet kubeadm kubectl -y;
		sudo apt-mark hold kubelet kubeadm kubectl;

		sudo systemctl enable --now kubelet;

install_kubernetes_cni: ## Install Kubernetes CNI
		kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml

install_kubernetes_ingress: ## Install Kubernetes Ingress
		helm upgrade --install ingress-nginx ingress-nginx --repo https://kubernetes.github.io/ingress-nginx --namespace ingress-nginx --create-namespace

reset_kubernetes_plane: ## Reset Kubernetes control plane cluster
		sudo kubeadm reset -f;

		sudo rm -rf /etc/cni/net.d;
		sudo rm -rf /var/lib/etcd;
		sudo rm -rf /var/lib/kubelet/*;
		sudo rm -rf /etc/kubernetes;

		#sudo kubeadm init --pod-network-cidr=10.244.0.0/16,2001:db8:42:0::/56 --service-cidr=10.96.0.0/16,2001:db8:42:1::/112 #IPv6
		sudo kubeadm init --pod-network-cidr=10.244.0.0/16 --service-cidr=10.96.0.0/16

		mkdir -p $(HOME)/.kube
		sudo cp -i /etc/kubernetes/admin.conf $(HOME)/.kube/config
		sudo chown $(shell id -u):$(shell id -g) $(HOME)/.kube/config

reset_kubernetes_worker: ## Reset Kubernetes worker cluster
		sudo kubeadm reset;

		sudo rm -rf /etc/cni/net.d;
		sudo rm -rf /var/lib/etcd;
		sudo rm -rf /var/lib/kubelet/*;
		sudo rm -rf /etc/kubernetes;
