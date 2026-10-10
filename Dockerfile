FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY client/package*.json client/
COPY server/package*.json server/
RUN npm ci
COPY . .
RUN npm run build --workspace client && npm run build --workspace server
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
