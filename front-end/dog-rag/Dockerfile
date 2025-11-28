# 依存インストール
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Prisma Client 生成用ステージ
FROM node:20-alpine AS prisma
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

# ビルドステージ
FROM node:20-alpine AS builder
WORKDIR /app

# 依存関係
COPY --from=deps /app/node_modules ./node_modules

# ✅ ここを修正：.prisma ではなく generated をコピー
COPY --from=prisma /app/generated ./generated

# アプリ本体
COPY . .

# Next.js ビルド
RUN npm run build

# 実行ステージ
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app ./

CMD ["npm", "start"]
