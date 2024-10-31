# Stage 1: Run
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy the built files from the builder stage
COPY ./dist/apps/web ./dist/apps/web
COPY package.json yarn.lock ./
COPY public ./public
COPY views ./views

# Install only production dependencies
RUN yarn install --production --verbose

# Run the application
CMD ["node", "dist/apps/web/main"]
