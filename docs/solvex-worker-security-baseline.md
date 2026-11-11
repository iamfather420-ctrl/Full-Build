# SolveX Docker Worker — Oracle Cloud Ampere Security Baseline

Target: Oracle Cloud Always Free Ampere A1 (Ubuntu 24.04 LTS)
Role: Host-side dispatcher for digest-pinned SolveX sandbox image
Date: 2026-11-11

## 0. Non-negotiable gates (must pass before any live job)

- [ ] Inbound: TCP 443 only
- [ ] Inbound: TCP 2375 DENIED
- [ ] Inbound: TCP 2376 DENIED
- [ ] All other inbound ports DENIED
- [ ] Docker daemon bound to local Unix socket only (no tcp listener)
- [ ] Dispatcher exposed exclusively via authenticated HTTPS on 443
- [ ] No merge, no simulated success, no live jobs until all checks pass

## 1. OS hardening

sudo apt update && sudo apt upgrade -y
sudo apt install -y ufw fail2ban unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades   # enable

# Disable root SSH login
sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

## 2. Docker install (official repo)

sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER   # re-login after

## 3. Docker daemon: Unix socket ONLY

sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "hosts": ["unix:///var/run/docker.sock"],
  "iptables": true,
  "ip6tables": true,
  "live-restore": true,
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
EOF
sudo systemctl restart docker

# Verify no TCP listener
ss -lntp | grep dockerd
# Expect: nothing on 0.0.0.0:2375 or 0.0.0.0:2376

## 4. Firewall (ufw)

sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw deny 2375/tcp
sudo ufw deny 2376/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp comment 'SSH admin only'
sudo ufw --force enable
sudo ufw status verbose

# Verify from outside (or another machine):
# curl -v telnet://<VM_IP>:2375   -> must fail
# curl -vk https://<VM_IP>/health -> must fail (no cert yet) or pass once TLS is up

## 5. TLS on 443

Option A (recommended): Caddy reverse proxy with automatic Let's Encrypt
sudo apt install -y caddy
sudo tee /etc/caddy/Caddyfile > /dev/null <<'EOF'
your.domain.com {
    reverse_proxy 127.0.0.1:8080
}
EOF
sudo systemctl enable --now caddy

Option B: self-signed cert if no domain yet (dev/test only)
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 90 -nodes \
  -subj "/CN=solvex-worker"

## 6. Worker secrets

export SOLVEX_WORKER_TOKEN=$(openssl rand -hex 32)
export SOLVEX_SANDBOX_IMAGE="solvex-sandbox:ci@sha256:<64-hex-digest>"
# Store in /etc/solvex/worker.env, mode 600, owned by service user
sudo mkdir -p /etc/solvex
sudo tee /etc/solvex/worker.env > /dev/null <<EOF
SOLVEX_WORKER_TOKEN=${SOLVEX_WORKER_TOKEN}
SOLVEX_SANDBOX_IMAGE=${SOLVEX_SANDBOX_IMAGE}
PORT=8080
EOF
sudo chmod 600 /etc/solvex/worker.env

## 7. Preload pinned sandbox image

docker pull node:22-alpine
BASE=$(docker image inspect node:22-alpine --format '{{index .RepoDigests 0}}')
docker build --build-arg NODE_BASE_IMAGE="$BASE" -f sandbox/Dockerfile -t solvex-sandbox:ci .
docker image inspect solvex-sandbox:ci --format '{{index .RepoDigests 0}}'
# Copy that digest into SOLVEX_SANDBOX_IMAGE above

## 8. Run dispatcher

cd railway/solvex-docker-worker
node server.mjs
# Health: curl -s http://127.0.0.1:8080/health  (local only)

## 9. Launch checklist

- [ ] ufw: 443 open, 2375/2376 denied, default deny
- [ ] dockerd listening on unix socket only
- [ ] TLS terminating on 443 (Caddy or cert)
- [ ] Dispatcher behind auth (bearer token)
- [ ] Sandbox image digest-pinned
- [ ] Secrets in 600-mode file, not in shell history
- [ ] fail2ban active
- [ ] Unattended upgrades on
- [ ] One authenticated test job returns a bounded receipt
- [ ] End-to-end live person flow demonstrated before any merge
