FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY static/ ./static/

RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && mkdir -p /data \
    && chown -R appuser:appgroup /app /data

USER appuser

ENV PORT=3000
ENV DATA_DIR=/data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
