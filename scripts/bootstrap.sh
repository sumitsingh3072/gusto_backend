#!/usr/bin/env bash
set -e
pnpm install
pnpm docker:up
sleep 3
pnpm prisma:migrate:dev
echo "Gusto backend bootstrapped. Run 'pnpm dev' to start all services."
