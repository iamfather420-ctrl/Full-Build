export * from "./architecture.js";
export * from "./kernel.js";
export * from "./planner.js";
export * from "./assembler.js";
export * from "./training.js";
import { writeFile, readFile } from "node:fs/promises";
import { ModelWeights } from "./kernel.js";
import { validateWeights } from "./assembler.js";
export async function saveModel(path:string,model:ModelWeights):Promise<void>{const v=validateWeights(model);if(!v.valid)throw new Error(v.errors.join("; "));await writeFile(path,JSON.stringify(model),"utf8");}
export async function loadModel(path:string):Promise<ModelWeights>{const m=JSON.parse(await readFile(path,"utf8")) as ModelWeights;const v=validateWeights(m);if(!v.valid)throw new Error(v.errors.join("; "));return m;}
