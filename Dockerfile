FROM mcr.microsoft.com/playwright:v1.40.0-noble

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Run continuous checker (one loop iteration = check + wait)
CMD ["node", "src/index.js"]
