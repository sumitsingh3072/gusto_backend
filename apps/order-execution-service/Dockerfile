FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo run build --filter=order-execution-service
RUN pnpm deploy --filter=order-execution-service --prod /prod/order-execution-service

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=build /prod/order-execution-service ./
COPY --from=build /app/apps/order-execution-service/prisma/generated/client/libquery_engine-linux-musl-arm64-openssl-3.0.x.so.node ./prisma/generated/client/
EXPOSE 3004
CMD ["node", "dist/main.js"]
