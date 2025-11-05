FROM node:20.19-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN corepack enable && pnpm install --no-frozen-lockfile

COPY . .

RUN pnpm exec tsc --skipLibCheck && pnpm exec tsc-alias -p tsconfig.json --resolve-full-paths && node scripts/fix-esm-imports.js



FROM node:20.19-alpine AS runner

WORKDIR /app

COPY --from=builder /app/dist ./dist

COPY --from=builder /app/node_modules ./node_modules

COPY package.json ./

CMD ["node", "dist/index.js"]
