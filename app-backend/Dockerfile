# App Backend — container image for Cloud Run
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
# Cloud Run provides PORT (defaults to 8080). The app reads process.env.PORT.
EXPOSE 8080
CMD ["node", "dist/index.js"]
