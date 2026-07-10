FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter=mcp-gateway-service run build
RUN pnpm deploy --filter=mcp-gateway-service --prod /prod/mcp-gateway-service

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /prod/mcp-gateway-service ./
EXPOSE 3008
CMD ["node", "dist/main.js"]
