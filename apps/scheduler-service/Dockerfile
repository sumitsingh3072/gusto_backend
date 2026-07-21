FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo run build --filter=scheduler-service
RUN pnpm deploy --filter=scheduler-service --prod /prod/scheduler-service

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=build /prod/scheduler-service ./
COPY --from=build /app/apps/scheduler-service/prisma/generated/client/libquery_engine-linux-musl-arm64-openssl-3.0.x.so.node ./prisma/generated/client/
EXPOSE 3006
CMD ["node", "dist/main.js"]
