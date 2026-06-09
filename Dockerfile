FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "node src/seed.js || echo seed-skipped; exec node src/index.js"]
