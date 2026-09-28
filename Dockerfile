# Build stage -----------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Dependencies first: this layer is reused whenever only source files change.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# NEXT_PUBLIC_* are inlined at build time. Empty API/WS URLs mean "same origin as the page":
# the Caddy reverse proxy on the Jetson forwards /api and /ws to the backend.
ARG NEXT_PUBLIC_API_BASE_URL=""
ARG NEXT_PUBLIC_WS_URL=""
ARG NEXT_PUBLIC_SITE_NAME="Greenhouse Melon"
ARG NEXT_PUBLIC_SITE_LOCATION=""
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
    NEXT_PUBLIC_SITE_NAME=$NEXT_PUBLIC_SITE_NAME \
    NEXT_PUBLIC_SITE_LOCATION=$NEXT_PUBLIC_SITE_LOCATION \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Runtime stage ---------------------------------------------------------------
# output: "standalone" ships its own server.js and the node_modules it needs.
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

# Never run the application as root.
USER node
EXPOSE 3000
CMD ["node", "server.js"]
