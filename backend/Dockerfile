FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
RUN yarn install

# Copy source code
COPY . .

# Run tests - if this step fails, the build fails
RUN yarn test

# Build step (optional, depending on project)
# RUN yarn build  # Uncomment if you have a build step

EXPOSE 4000

CMD ["yarn", "start"]
