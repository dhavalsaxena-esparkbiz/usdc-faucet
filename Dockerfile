FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm install
COPY frontend frontend
COPY backend backend
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
COPY backend/package.json backend/
RUN npm install --workspace=backend --omit=dev
COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/backend/public backend/public
RUN mkdir -p backend/data
ENV DATABASE_PATH=/app/backend/data/faucet.db
EXPOSE 3000
CMD ["node", "backend/dist/index.js"]
