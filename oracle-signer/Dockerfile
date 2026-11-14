FROM node:22.23.5-alpine3.24@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a
ENV NODE_ENV=production PORT=8080
WORKDIR /opt/solvex-oracle-signer
COPY server.mjs ./server.mjs
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["node", "server.mjs"]
