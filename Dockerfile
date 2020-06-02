FROM node:carbon-alpine

RUN apk add --no-cache file bash git postgresql-client imagemagick graphicsmagick

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .
RUN npm run build

CMD ["npm", "run", "start:prod"]
