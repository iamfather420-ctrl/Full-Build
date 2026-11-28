---
title: "Model architecture"
---

**[Transformer](https://arxiv.org/abs/1706.03762)** — The standard neural-network architecture behind modern LLMs. Its core mechanism is **attention** (below). Most terms in this section are variations on it.

**Attention** — The mechanism that lets the model relate each token to every other token in the context ("which earlier words matter for the next word?"). It is expensive: cost grows with context length, which is why so many variants below exist.

**FFN (Feed-Forward Network) / MLP** — The other half of every transformer layer besides attention: each token is pushed through a small two-layer network independently (no token-to-token interaction). Holds most of a model's parameters — it's the part MoE replaces with experts, so "expert size" numbers are FFN hidden dimensions. Common variants swap the **activation function**: **[SwiGLU](https://arxiv.org/abs/2002.05202)** / **GeGLU** (gated versions of **SiLU** and **GELU**, used by Llama-family and Gemma models respectively); **SiTU** (Sigmoid Tanh Unit) is Kimi K3's variant (details pending the K3 tech report).

**Dense model** — A "normal" model where *all* parameters are used for every token (e.g. "dense 30.7B" [Gemma](https://arxiv.org/abs/2607.02770)). Opposite of MoE.

**[MoE](https://arxiv.org/abs/1701.06538) (Mixture of Experts)** — An architecture where the model contains many small sub-networks ("experts") and a router activates only a few per token. This is why you see two sizes: "284B total / 13B active" means the model has 284B parameters on disk/in memory, but only ~13B do work per token — so it's much faster than a dense 284B model. Written as suffixes like `-A10B` ("10B active").

**[LatentMoE](https://arxiv.org/abs/2601.18089) / Stable LatentMoE / Quantile Balancing** — NVIDIA's MoE variant that routes in a compressed latent space, allowing much sparser expert selection (more total experts per routed expert). **Stable LatentMoE** (Kimi K3, e.g. 16 of 896 experts active) adds **Quantile Balancing** — expert allocation derived from router-score quantiles instead of a tuned load-balancing loss; no standalone paper yet, only the K3 blog.

- **[Routed / shared experts](https://arxiv.org/abs/2401.06066)** — Routed experts are chosen per token by the router; shared experts always run.
- **Always-on dense FFN ([Gemma 4](https://arxiv.org/abs/2607.02770))** — Gemma 4's MoE layers run a full-size dense FFN in parallel with the routed experts and sum both outputs — a safety net against bad routing decisions (same role as a shared expert, but full-width). Means the "active parameters" floor is higher than the expert count alone suggests.
- **Expert routing / auxiliary-loss-free routing** (`noaux_tc`, `e_score_correction_bias`, `topk_method`, `scoring_func`) — Config knobs describing *how* the router picks experts (DeepSeek-V3 style). Only matters when a bad config breaks model loading. **Hash routing** = the expert is picked by token ID instead of a learned router (used in some early layers: cheap, stable per-token paths).

**[MLA](https://arxiv.org/abs/2405.04434) (Multi-head Latent Attention)** — DeepSeek's attention variant that stores a *compressed* version of the attention cache, making long contexts use far less GPU memory (e.g. 122K tokens of context in ~11 GiB instead of many times that).

**Gated MLA** — MLA with a learned (sigmoid output) gate on the attention output, used for the full-attention layers in Kimi K3; the exact form is undisclosed pending the K3 tech report. Not to be confused with **[embedding-gated MLA](https://arxiv.org/abs/2509.16686)**, a separately published variant.

**[GQA](https://arxiv.org/abs/2305.13245) (Grouped-Query Attention)** — A common attention optimization where several "query heads" share the same "key/value heads", shrinking the KV cache. Most modern non-DeepSeek models use it.

**[DSA](https://arxiv.org/abs/2512.02556) (DeepSeek Sparse Attention)** — DeepSeek's trick to make attention cheaper on long contexts: a small "**Lightning Indexer**" first picks the top-k most relevant earlier tokens, and full attention is only computed against those. The indexer keeps its own small cache.

**[NSA](https://arxiv.org/abs/2502.11089) (Native Sparse Attention)** — DeepSeek's earlier published sparse-attention design (same family of ideas as DSA): attend only to a selected subset of tokens instead of all of them, trained natively that way rather than bolted on afterwards.

**[CCA](https://arxiv.org/abs/2510.04476) (Compressed Convolutional Attention)** — Zyphra's attention variant (ZAYA1): the whole attention operation runs inside a *compressed* latent space (downproject → attend → upproject), shrinking both compute and KV cache. Same goal as MLA, but compresses the computation, not just the cache.

**[SWA](https://arxiv.org/abs/2004.05150) (Sliding-Window Attention)** — Attention limited to a fixed window of recent tokens (e.g. `sliding_window=128`) instead of the whole context. Cheap, but the layer can't see far back; models mix SWA layers with full-attention layers.

**Local-global attention ratio / dual RoPE** — How a model interleaves SWA ("local") and full-attention ("global") layers, e.g. Gemma's 5:1 pattern. The two layer types typically use different RoPE (below) base frequencies (**dual RoPE**: high `rope_theta` for global layers, low for local) — a config detail that breaks context extension if an engine applies scaling to the wrong layer type.

**[CSA](https://arxiv.org/abs/2606.19348) (Compressed Sparse Attention)** — DeepSeek-V4's attention for mid-range memory: every 4 tokens are *learned-compressed* into one KV entry (the model learns how much each token contributes), then a Lightning-Indexer-style top-k selection (as in DSA) picks only the most relevant compressed blocks to attend to. Compression + sparse retrieval.

**[HCA](https://arxiv.org/abs/2606.19348) (Heavily Compressed Attention)** — The long-range companion: every 128 tokens become one KV entry (32× lighter than CSA), and the model attends *densely* over that heavily compressed memory — a cheap global view rather than precise retrieval. V4 interleaves CSA and HCA layers 1:1, each with an extra 128-token sliding-window branch so the newest tokens are never summarized away. The shorthands **c4a / c128a** refer to these compression ratios. Note: attention cost still grows quadratically, just much slower — this is not linear attention.

**[MHC](https://arxiv.org/abs/2512.24880) (Manifold-Constrained [Hyper-Connections](https://arxiv.org/abs/2409.19606))** — A change to the transformer's residual stream (the "conveyor belt" carrying information between layers): instead of one stream, several parallel streams with learned mixing before/after each layer, increasing representational capacity across depth.

**[xHC](https://arxiv.org/abs/2607.14530) (Expanded Hyper-Connections)** — Scales the residual stream to 16 parallel streams (MHC stops at ~4) by updating only a few per layer while reading from all. **xHC-Flash** = the memory-efficient deployment variant.

**SSM (State-Space Model) / [Mamba](https://arxiv.org/abs/2312.00752) / [Mamba-2](https://arxiv.org/abs/2405.21060)** — An alternative to attention: instead of looking back at all tokens, the layer maintains a running "hidden state" that is updated token by token (like a summary it carries forward). Much cheaper for long contexts. "**[Hybrid](https://arxiv.org/abs/2403.19887)**" models interleave Mamba/SSM layers with attention layers. The serving payoff: only the attention layers keep a [KV cache](../inference/), so in a mostly-Mamba hybrid (e.g. 6 attention layers out of 52) the per-sequence cache stays near-constant as context grows — decode throughput at 256K context is about the same as at 4K, where a dense model's collapses.

**[GDN](https://arxiv.org/abs/2412.06464) (Gated DeltaNet)** — Qwen's hybrid linear-attention/recurrent layer type, building on **[DeltaNet](https://arxiv.org/abs/2406.06484)** (linear attention where the state is updated by the *delta rule* — overwrite the old memory for a key instead of just adding to it) by adding a Mamba-2-style decay gate (used in ~75% of Qwen3.5/3.6 layers). Like SSMs, it carries a running state — which has practical consequences: the state can't be checkpointed per token, so features like prefix caching and speculative-decoding rollback don't work naturally with it.

**[KDA](https://arxiv.org/abs/2510.26692) (Kimi Delta Attention)** — Moonshot's linear-attention layer type (introduced in **Kimi Linear**, the bulk of Kimi K3's layers): a refined, more general Gated DeltaNet with finer-grained per-channel gating. Same running-state caveats as GDN — prefix caching needs special handling (Moonshot contributed a vLLM implementation, including **KDA with prefill cache** for K3). Adopted beyond Moonshot: Ant's **Ling 3.0 flash** interleaves 5 KDA layers per MLA layer — a **hybrid-linear attention** stack, the linear-attention analogue of the local-global ratio above.

**AttnRes (Attention Residuals)** — [Kimi's](https://arxiv.org/abs/2603.15031) replacement for fixed residual connections: each layer attends over *earlier layers'* outputs with learned input-dependent weights instead of summing them uniformly — same problem space as hyper-connections (MHC/xHC below).

**Diffusion LM (dLLM) / text diffusion** — An alternative to left-to-right generation: the model starts from a fully masked/noisy block of text and refines it over several "denoising" steps, filling in whole passages in parallel (same idea as image diffusion). Promises much faster generation; used both for full models and as a drafting trick (see DFlash under [Speculative decoding](../speculative-decoding/)).

**Encoder / decoder** — Two transformer flavors. *Decoders* generate text left-to-right (all chat LLMs). *Encoders* read the whole input at once and output a representation (classic for embeddings, e.g. BERT-style). Matters for embedding models: decoder-based embedders need **last-token pooling** (take the representation of the final token), encoders typically use mean/CLS pooling.

**lm-head** — The model's final layer that converts its internal representation into scores over the vocabulary (i.e. "which token comes next"). Sometimes quantized separately.

**[Tied embeddings](https://arxiv.org/abs/1608.05859)** (`tie_word_embeddings`) — The lm-head shares its weight matrix with the input embedding instead of having its own. Common on small models, where the embedding table is a big fraction of total params — one reason a "1B" model's disk size can differ from naive expectations.

**[RMSNorm](https://arxiv.org/abs/1910.07467) / LayerNorm** — Normalization layers that keep activations in a stable range between transformer sublayers; RMSNorm is the cheaper variant nearly all modern LLMs use. **[QK-norm](https://arxiv.org/abs/2302.05442)** applies it to query/key vectors inside attention — its presence tames activation outliers, which is one reason some models quantize much more gracefully than others.

**[Logit softcapping](https://arxiv.org/abs/2408.00118)** — Gemma 2's tanh clamp on attention and final logits to keep values bounded. A serving footgun: it's incompatible with standard FlashAttention, so engines need explicit support (`attn_logit_softcapping` in the config) or they silently degrade quality.

**[PLE](https://arxiv.org/abs/2506.10943) (Per-Layer Embeddings)** — Gemma 3n/4's trick: each layer gets extra embedding tables that can be streamed from CPU RAM or disk on demand instead of living in VRAM. This is why Gemma 3n's "effective" memory footprint (e.g. 2B-class) is far below its raw parameter count.

**[MatFormer](https://arxiv.org/abs/2310.07707) (Matryoshka Transformer)** — Nested-model training used by **Gemma 3n**: smaller sub-models live inside the full model's FFN and can be extracted (or mixed-and-matched per layer) to trade quality for speed without retraining — one download, several deployable sizes.

**[Multimodal / vision model](https://arxiv.org/abs/2304.08485)** — A model that accepts images as well as text. `--language-model-only` disables the vision part to save memory when only text is needed.

**[RoPE](https://arxiv.org/abs/2104.09864) (Rotary Position Embedding)** — The standard way modern LLMs encode *where* a token sits in the sequence: query/key vectors are rotated by an angle that depends on position. Its base frequency (`rope_theta`) determines the usable context length — context-extension tricks work by rescaling it.

**[NoPE](https://arxiv.org/abs/2305.19466) (No Positional Embeddings)** — Dropping positional encoding entirely and letting the model infer order from the causal attention mask; now appearing in frontier hybrid models, where the linear-attention layers carry position implicitly through their recurrence. For such models, RoPE-related config (`rope_theta`, scaling) doesn't apply.

**[YaRN](https://arxiv.org/abs/2309.00071)** — A technique to stretch a model's context window beyond what it was trained on (e.g. extending to 1M tokens) by rescaling RoPE frequencies.

**[CoT](https://arxiv.org/abs/2201.11903) (Chain of Thought) / thinking / reasoning** — The model "thinks out loud" before answering, emitting reasoning inside special tags (e.g. `<think>…</think>`). Serving-side knobs: `enable_thinking`, `reasoning_effort`, `thinking_token_budget`. The **reasoning parser** (below) strips this into a separate `reasoning` field so clients don't see it mixed into the answer. **Hybrid reasoning** = one checkpoint serves both modes — thinking can be toggled per request, or the model scales its own thinking effort with task difficulty, instead of shipping separate instruct/reasoning models.

**model_type** — The architecture identifier in a HuggingFace model config (`deepseek_v3`, `qwen3_5_moe`, `nemotron_h`, …). Tells the engine which code path to load.
