# Stribog-Bot container image.
#
# Two stages: the first one installs production dependencies with the
# compilers that better-sqlite3 needs on platforms without a prebuilt binary;
# the runtime stage never ships python3/make/g++.
FROM node:22-bookworm-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY LICENSE README.md ./
RUN useradd --uid 10001 --create-home stribog \
    && mkdir -p /app/data \
    && chown -R 10001:10001 /app/data
USER 10001
ENV NODE_ENV=production
# SQLite lives here (src/utils/database.js resolves ../../data). Mount it.
VOLUME ["/app/data"]
# Discord gateway traffic is outbound only and the bot exposes no HTTP port,
# so there is no honest endpoint to probe here. A container that is still
# running is connected; compose restarts it with `restart: unless-stopped`.
# Configuration comes from the environment (compose `env_file`), never from a
# copied .env: that file is excluded in .dockerignore.
CMD ["node", "src/index.js"]
