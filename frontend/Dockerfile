# Frontend Dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy dependency files first for better layer caching
COPY package.json yarn.lock ./

# Install dependencies with strict lockfile resolution
RUN yarn install --frozen-lockfile

# Copy the rest of the app
COPY . .

# Build the production version (for React/Next apps)
RUN yarn build

EXPOSE 3000

CMD ["yarn", "start"]
