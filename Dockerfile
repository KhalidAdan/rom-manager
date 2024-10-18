FROM node:22.10-bookworm

WORKDIR /app

COPY package*.json ./

ENV NPM_CONFIG_LOGLEVEL=verbose

RUN npm install

COPY . .

RUN npm run build
RUN npm cache clean --force

EXPOSE 5173

ENV NODE_ENV=production
ENV DATABASE_URL=""
ENV SESSION_SECRET=""
ENV TWITCH_CLIENT_ID=""
ENV TWITCH_SECRET=""

CMD ["/bin/sh", "-c", "npx prisma migrate deploy && npm start"]