import { test } from "node:test";
import assert from "node:assert/strict";
import { loadKernel, planBuild, splitParts, verifyShard, assembleTensors, validateWeights, generateDataset, evaluate, applySgd } from "../src/index.js";
const arch={name:"test-mlp",family:"mlp-classifier" as const,inputSize:2,hiddenSizes:[8],outputSize:1,seed:42};
test("plans, shards, verifies and reassembles deterministic tensors",()=>{const m=loadKernel(arch),p=planBuild(arch,3),s=splitParts(m,3);assert.equal(p.totalParameters,m.tensors.reduce((n,t)=>n+t.data.length,0));assert.ok(s.every(verifyShard));assert.deepEqual(assembleTensors(s,m).tensors,m.tensors);const bad=structuredClone(s[0]);bad.tensors[0].data[0]+=1;assert.equal(verifyShard(bad),false);});
test("SGD lowers loss on generated deterministic data",()=>{const m=loadKernel(arch),d=generateDataset(128,2,1,12),before=evaluate(m,d),trained=applySgd(m,d,.03,80);assert.ok(trained.metadata.trainedSteps>0);assert.ok(evaluate(trained,d)<before);assert.equal(validateWeights(trained).valid,true);});
