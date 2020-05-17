FROM node:carbon-alpine

RUN apk update && apk add git bash postgresql-client graphicsmagick

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .
RUN npm run build

CMD ["npm", "run", "start:prod"]
