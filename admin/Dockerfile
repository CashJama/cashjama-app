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

# Install serve to serve static files
RUN yarn global add serve

# Expose port
EXPOSE 10000

# Serve the built app
CMD ["serve", "-s", "dist", "-l", "10000"]
