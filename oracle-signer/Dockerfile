ARG NODE_BASE_IMAGE
FROM ${NODE_BASE_IMAGE}
ARG NODE_BASE_IMAGE
RUN case "${NODE_BASE_IMAGE}" in *@sha256:*) ;; *) echo "NODE_BASE_IMAGE must be pinned by sha256 digest" >&2; exit 1 ;; esac
ENV NODE_ENV=production PORT=8080
WORKDIR /opt/solvex-oracle-signer
COPY server.mjs ./server.mjs
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["node", "server.mjs"]
