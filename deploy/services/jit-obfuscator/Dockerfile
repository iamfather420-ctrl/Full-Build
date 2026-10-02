# ==============================================================================
# dAIsy HaMINJA JIT Binary & APK Obfuscator Dockerfile (Go-based anti-tamper dynamic packager)
# ==============================================================================
FROM golang:1.21-alpine AS builder

WORKDIR /usr/src/app

RUN apk add --no-cache git upx

COPY go.mod go.sum* ./
RUN go mod download

COPY . .

# Compile and compact binary with UPX and high compilation security flags
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w -extldflags '-static'" \
    -o jit-obfuscator . \
    && upx --best --lzma jit-obfuscator

# Production Runner
FROM alpine:3.18 AS runner

WORKDIR /usr/src/app

RUN apk add --no-cache ca-certificates

COPY --from=builder /usr/src/app/jit-obfuscator /usr/local/bin/jit-obfuscator

EXPOSE 9000

# Hardened security: Run as non-privileged system user
RUN addgroup -g 10001 -S daisy && adduser -u 10001 -S daisy-obfuscator -G daisy
USER daisy-obfuscator

CMD ["jit-obfuscator"]
