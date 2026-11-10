ARG NODE_BASE_IMAGE
FROM ${NODE_BASE_IMAGE}
ARG NODE_BASE_IMAGE
RUN case "${NODE_BASE_IMAGE}" in *@sha256:*) ;; *) echo "NODE_BASE_IMAGE must be pinned by sha256 digest" >&2; exit 1 ;; esac
WORKDIR /opt/solvex-sandbox
COPY --chown=65534:65534 sandbox/verify-source.mjs /opt/solvex-sandbox/verify-source.mjs
USER 65534:65534
ENTRYPOINT ["node", "/opt/solvex-sandbox/verify-source.mjs"]
