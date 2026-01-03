FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json yarn.lock* ./

# Install dependencies
RUN yarn install --frozen-lockfile || yarn install

# Copy source code
COPY . .

# Build the app
RUN yarn build

# Copy serve.json to dist for SPA routing config
COPY serve.json dist/

# Install serve to serve static files
RUN yarn global add serve

# Expose port
EXPOSE 10000

# Serve the built app with SPA mode (-s) and config file
CMD ["serve", "-s", "dist", "-l", "10000", "-c", "../serve.json"]
