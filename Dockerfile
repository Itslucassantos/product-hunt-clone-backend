FROM node:24-slim AS build
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate \
  && npm run build

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm pkg delete scripts.prepare \
  && npm ci --omit=dev \
  && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
COPY prisma.config.ts ./
USER node
EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3333)+'/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
