
# Production image: builds the React client, then runs the Express
# server which serves that build AND the /api routes on one port. This
# is the image Render builds and deploys - one service, one Dockerfile.

FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
# Baked into the JS bundle at build time (Vite env vars are compile-time).
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

FROM node:20-alpine AS server
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev
COPY server/ ./
COPY --from=client-build /app/client/dist /app/client/dist

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "src/index.js"]
