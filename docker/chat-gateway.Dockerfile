# Stage 1: Run
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy the built files from the builder stage
COPY ./dist/apps/chat-gateway ./dist/apps/chat-gateway
COPY package.json yarn.lock ./

# Install only production dependencies
RUN yarn install --production --verbose

# Run the application
CMD ["node", "dist/apps/chat-gateway/main"]
