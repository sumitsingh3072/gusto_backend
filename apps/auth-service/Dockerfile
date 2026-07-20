FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo run build --filter=auth-service
RUN pnpm deploy --filter=auth-service --prod /prod/auth-service

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=build /prod/auth-service ./
COPY --from=build /app/apps/auth-service/prisma/generated/client/libquery_engine-linux-musl-arm64-openssl-3.0.x.so.node ./prisma/generated/client/
EXPOSE 3001
CMD ["node", "dist/main.js"]
