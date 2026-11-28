---
title: "Deployment & platform (Docker / Kubernetes)"
---

**[Docker](https://docs.docker.com/get-started/) / container** — The standard way to package and run inference engines: the engine, its CUDA libraries, and Python dependencies ship as one **image** (e.g. `vllm/vllm-openai`), so nothing has to be installed on the host except the GPU driver. **docker compose** describes multi-container setups (engine + proxy + monitoring) in one file.

**[NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/overview.html) (`--gpus all`)** — The bridge that lets containers see the host's GPUs. Without it a container has no GPU access; version mismatches between host driver and image CUDA are a classic startup failure.

**Kubernetes (K8s)** — The container-orchestration system used to run serving at scale (and the base of most managed AI platforms). Relevant vocabulary: **pod** (running container instance), **[PVC](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)** (persistent volume claim — a chunk of storage, e.g. for model weights), **RWX** (storage mountable by many pods at once), **hostPath** (mounting a node directory — often forbidden by cluster policy), **/dev/shm** (shared-memory filesystem pods use for inter-process communication), **CRD** (custom resource definition — a K8s API extension), **[Kyverno](https://kyverno.io/docs/)** (a policy engine that enforces/mutates cluster rules).

**[KServe](https://kserve.github.io/website/)** — A Kubernetes model-serving framework (used by several commercial AI platforms). An **InferenceService (isvc)** is one deployed model (with its URL and bearer-token **JWT** auth); a **ServingRuntime** defines the container/args used to run it; **autoscaling/replicas** control how many copies run.

**Managed AI appliances** — Vendor products that bundle hardware + Kubernetes + a serving layer into an on-prem "private AI cloud" (e.g. HPE Private Cloud AI, Dell AI Factory, Nutanix GPT-in-a-Box). Typically locked-down: limited volume mounts, pod logs, and SSH access compared to a cluster you run yourself.

**HF / HuggingFace** — The standard hub for downloading model weights (`HF_TOKEN` = auth token; **[Xet](https://huggingface.co/docs/hub/en/xet/index)** = its newer CDN download backend).

**Engine wedge** — Informal term for a serving incident where the engine silently stalls without crashing (typical root cause: memory swapping; related vocab: **swap-thrash**, **vm.swappiness**, **OOM-killer**, **demand-paging** — Linux memory-management behaviors that can starve the GPU process).

**[frp / frpc](https://github.com/fatedier/frp)** — A reverse-proxy tunnel tool for exposing a machine behind NAT/firewall (e.g. a home lab serving endpoint) to the internet.
