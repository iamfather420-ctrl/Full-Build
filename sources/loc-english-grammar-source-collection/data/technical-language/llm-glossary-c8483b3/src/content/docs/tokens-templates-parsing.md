---
title: "Tokens, templates & parsing"
---

**[Tokenizer](https://arxiv.org/abs/1508.07909)** — Converts text ↔ tokens using the model's fixed **vocab** (vocabulary). The **detokenizer** converts output tokens back to text. `--tokenizer-mode` selects the implementation.

**[Special tokens](https://huggingface.co/docs/tokenizers/en/concepts/special-tokens)** — Non-text control tokens: **BOS** (beginning-of-sequence), **EOS** (end-of-sequence — the model emits it to stop). Bugs here are visible: a "BOS leak" prints `<｜begin▁of▁sentence｜>` into the user's answer; a wrong EOS makes the model never stop. `skip_special_tokens` controls whether they're stripped from output.

**[Chat template](https://huggingface.co/docs/transformers/chat_templating)** — A per-model recipe (written in **Jinja**, a templating language) that converts a conversation (system/user/assistant messages, tool definitions) into the exact token sequence the model was trained on. Getting this wrong silently degrades quality. `add_generation_prompt` = whether the template appends the "now the assistant speaks:" marker.

**[Tool calling / function calling](https://platform.openai.com/docs/guides/function-calling)** — The model asking the client to run a function (e.g. "call get_weather(city=Berlin)") by emitting structured output. `tool_choice: auto/required` controls whether the model may/must call tools; `--enable-auto-tool-choice` turns support on.

**[Tool-call parser / reasoning parser](https://docs.vllm.ai/en/stable/features/tool_calling/)** — vLLM plugins (`--tool-call-parser`, `--reasoning-parser`) that recognize each model's proprietary output markup and convert it into clean OpenAI-API-style fields. Historically hand-rolled per model and fragile in streaming; the new unified **ParserEngine** replaces them.

**[DSML](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash/blob/main/encoding/README.md)** — DeepSeek's proprietary markup language for tool calls inside its raw output (tags like `<｜DSML｜…>`). The parser must strip it; a known bug leaked close-tags into tool arguments.

**[FIM](https://arxiv.org/abs/2207.14255) (Fill-In-the-Middle)** — Code models are trained to complete a gap *between* a prefix and a suffix (not just continue left-to-right), controlled by special FIM tokens (`<|fim_prefix|>`, `<|fim_suffix|>`, `<|fim_middle|>`-style). This is what powers editor autocompletion; serving it means sending those tokens in the right order per model.

**[Structured output](https://platform.openai.com/docs/guides/structured-outputs)** — Constraining the model to emit valid JSON matching a schema.
