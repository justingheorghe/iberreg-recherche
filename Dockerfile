FROM node:24-alpine AS frontend-builder

WORKDIR /build

COPY react-ui/package.json react-ui/package-lock.json ./
RUN npm install

COPY react-ui/ ./
RUN npm run build

FROM node:24-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

COPY --from=frontend-builder /build/dist ./public

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000
CMD ["node", "src/server.js"]