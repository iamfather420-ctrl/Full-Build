# Daisy Weight Engine
A deterministic CPU reference implementation for constructing, sharding, training, validating, and serializing dense MLP tensor weights. It creates actual numerical parameters and trains them against an explicit dataset/objective; it is not a pretrained Daisy language model.

## Use
```ts
import { loadKernel, generateDataset, applySgd, saveModel } from "@daisyhaminja/daisy.weight-engine";
const architecture={name:"daisy-seed",family:"mlp-classifier",inputSize:2,hiddenSizes:[8],outputSize:1,seed:42} as const;
const model=loadKernel(architecture);
const trained=applySgd(model,generateDataset(256,2,1),0.03,100);
await saveModel("./daisy-weights.json",trained);
```
Run tests with `npm test` in this package. This baseline is CPU/MLP classification/regression infrastructure, not a transformer/GGUF inference backend. Full-Build's local inference runtime still requires a compatible executable engine adapter and model format.
