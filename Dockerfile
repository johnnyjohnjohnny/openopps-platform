FROM node:carbon

RUN apt-get update && \
  apt-get install -y postgresql-client graphicsmagick

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

CMD node app.js
