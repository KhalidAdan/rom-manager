FROM node:22.10-bookworm

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

RUN npm run build
RUN npm cache clean --force

EXPOSE 5173

ENV NODE_ENV=production

CMD ["/bin/sh", "-c", "export PORT=5173 && npx prisma migrate deploy && npx prisma generate --sql && npm start"]