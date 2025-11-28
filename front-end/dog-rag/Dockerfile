# 依存関係インストール用
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ビルド用
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 実行用
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# ビルド済みアプリをコピー
COPY --from=builder /app ./

EXPOSE 3000
CMD ["npm", "start"]
