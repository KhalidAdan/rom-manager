FROM node:24-bookworm

WORKDIR /app

COPY package*.json ./

ENV NPM_CONFIG_LOGLEVEL=verbose
ENV PORT=5173
# GENERATE
RUN sed -i '/^DEPLOY_SECRET=/d' .env 2>/dev/null || true && \
    export DEPLOY_SECRET=$(openssl rand -base64 32) && \
    echo "DEPLOY_SECRET=$DEPLOY_SECRET" >> .env

RUN npm ci

COPY . .

# Prisma 7: the client is generated into app/generated and bundled by the
# build, and TypedSQL generation needs a live database. The real db and
# migrations are dockerignored, so push the schema into a throwaway db,
# generate, then discard it.
RUN DATABASE_URL=file:./prisma/build-tmp.db npx prisma db push --skip-generate && \
    DATABASE_URL=file:./prisma/build-tmp.db npx prisma generate --sql && \
    rm -f prisma/build-tmp.db

RUN npm run build
RUN npm cache clean --force

EXPOSE 5173

ENV NODE_ENV=production

CMD ["/bin/sh", "-c", "export PORT=5173 && npx prisma migrate deploy && npm start"]
