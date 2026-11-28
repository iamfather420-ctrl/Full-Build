---
title: "LLM basics"
---

**[LLM](https://arxiv.org/abs/2005.14165) (Large Language Model)** — A neural network trained on huge amounts of text that generates text one small piece (token) at a time. Self-hosting means running ("serving") such models on your own hardware instead of using a cloud API.

**Token** — The unit an LLM reads and writes. Roughly a word fragment: ~3–4 characters of English on average. "128K context" means the model can consider ~128,000 tokens of input at once. Speeds are measured in **tok/s** (tokens per second).

**Context / context window / context length** — The amount of text (in tokens) the model can "see" at once: the conversation so far plus its own output. Bigger contexts need more GPU memory. "@32k" in benchmarks means "with a 32,000-token prompt".

**Prompt** — The input text sent to the model (system instructions + conversation + question).

**Inference** — Running a trained model to get answers (as opposed to *training* it). "Inference engine" = the software that does this efficiently (vLLM, SGLang, llama.cpp, …).

**Serving** — Running a model behind an API so applications can send requests to it.

**[Weights / parameters](https://arxiv.org/abs/2001.08361) (params)** — The learned numbers that make up a model. "31B" = 31 billion parameters. More parameters ≈ more capable but needs more memory and compute.

**Checkpoint** — A saved copy of a model's weights, usually downloaded from HuggingFace.

**[WSD](https://arxiv.org/abs/2404.06395) (Warmup–Stable–Decay)** — The learning-rate schedule most modern pretraining reports use (MiniCPM, DeepSeek, Olmo, …): ramp up briefly, hold a constant rate for most of training, then decay sharply at the end. Unlike the older cosine schedule, the total token count doesn't need to be fixed upfront — you can keep training in the stable phase and branch off a "decayed" checkpoint whenever you want a releasable model.

**[Muon](https://arxiv.org/abs/2502.16982)** — An optimizer (alternative to **AdamW**) that orthogonalizes weight updates; used to pretrain Kimi K2/K3 and increasingly cited in model cards. Roughly 2× more token-efficient than AdamW in reported runs — a training-side detail, but a buzzword you'll meet reading release notes. **Per-Head Muon** (Kimi K3) orthogonalizes each attention head's update independently instead of whole weight matrices.

**[µP](https://arxiv.org/abs/2203.03466) (Maximal Update Parametrization)** — A way of parametrizing a network so optimal hyperparameters (like learning rate) transfer from small models to large ones — tune cheap, train big (**µTransfer**). Shows up in tech reports to explain how hyperparameters were chosen.

**Midtraining / context extension** — Training phases between pretraining and post-training: continued training on curated data (math/code/long documents) while progressively extending the context window (e.g. 32K → 128K → 256K). Model cards often report these phases separately from the main pretraining token count.

**[Sampling / sampling parameters](https://arxiv.org/abs/1904.09751)** — How the model picks the next token from its probability distribution. **temperature** (higher = more random), **top_p** / **top_k** (restrict choices to the most likely tokens), **greedy** (always pick the single most likely token — deterministic). Models ship recommended defaults in **`generation_config.json`**; vLLM's `--override-generation-config` patches them server-side (e.g. `{"temperature": 0.7, "top_p": 0.95}`) so clients that send no sampling params still get the model's intended settings.

**Logits** — The raw scores the model assigns to every possible next token before they're turned into probabilities.
