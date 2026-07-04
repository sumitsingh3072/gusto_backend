FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile --filter=coupon-optimization-service...
RUN pnpm --filter=coupon-optimization-service run prisma:generate --if-present
RUN pnpm --filter=coupon-optimization-service run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/coupon-optimization-service/dist ./dist
COPY --from=build /app/apps/coupon-optimization-service/node_modules ./node_modules
COPY --from=build /app/apps/coupon-optimization-service/package.json ./package.json
EXPOSE 3003
CMD ["node", "dist/main.js"]
