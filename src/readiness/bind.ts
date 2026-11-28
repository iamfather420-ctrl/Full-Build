import { validateWeights } from "../../packages/daisy-weight-engine/src/assembler.js";
import { loadKernel } from "../../packages/daisy-weight-engine/src/kernel.js";
import { applySgd, evaluate } from "../../packages/daisy-weight-engine/src/training.js";
import { configureWeightEngine } from "./service";

configureWeightEngine({ loadKernel, applySgd, evaluate, validateWeights });
