FROM node:20-alpine

WORKDIR /app

COPY --chown=node:node package*.json ./
RUN npm ci

COPY --chown=node:node . .
RUN npm run build

USER node

EXPOSE 3001

CMD ["npm", "run", "start:prod"]