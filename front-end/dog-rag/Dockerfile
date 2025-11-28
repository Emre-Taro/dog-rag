# 依存インストール
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Prisma Client を生成するステージ
FROM node:20-alpine AS prisma
WORKDIR /app
COPY prisma ./prisma
COPY package*.json ./
RUN npm ci
RUN npx prisma generate

# ビルドステージ
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=prisma /app/prisma ./prisma
COPY . .

RUN npm run build

# 実行ステージ
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app ./

CMD ["npm", "start"]
