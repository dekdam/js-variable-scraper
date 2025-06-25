FROM node:23-alpine3.20 AS base

RUN mkdir -p ./app
WORKDIR /app
# COPY . ./
COPY ./app.js .
COPY ./package*.json ./
COPY ./public ./public

ENV NODE_ENV=production
ARG port=3000
EXPOSE $port
ENV PORT=$port
ENV HOSTNAME="0.0.0.0"

RUN npm install

ENTRYPOINT ["npm", "run", "start"]