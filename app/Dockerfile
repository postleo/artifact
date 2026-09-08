# Frontend — build the Vite/React app, serve the static bundle with nginx on Cloud Run.
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_BACKEND_URL is baked into the bundle at build time (Vite inlines import.meta.env).
# Pass it via --build-arg (see cloudbuild.yaml). Defaults to local dev.
ARG VITE_BACKEND_URL=http://localhost:5000/api
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Cloud Run routes to $PORT (8080); nginx.conf listens on 8080.
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
