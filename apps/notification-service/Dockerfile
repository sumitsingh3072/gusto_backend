FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo run build --filter=notification-service
RUN pnpm deploy --filter=notification-service --prod /prod/notification-service

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=build /prod/notification-service ./
COPY --from=build /app/apps/notification-service/prisma/generated/client/libquery_engine-linux-musl-arm64-openssl-3.0.x.so.node ./prisma/generated/client/
EXPOSE 3007
CMD ["node", "dist/main.js"]
