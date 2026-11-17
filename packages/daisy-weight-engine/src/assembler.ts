import { createHash } from "node:crypto";
import { ModelWeights, Tensor, tensorDigest } from "./kernel.js";
export interface WeightShard { index:number; tensors:Tensor[]; checksum:string; }
const hash=(v:unknown)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
export function splitParts(model:ModelWeights,parts:number):WeightShard[] {
 if(!Number.isInteger(parts)||parts<1)throw new Error("parts must be positive");
 const groups=Array.from({length:parts},()=>[] as Tensor[]);
 model.tensors.forEach((t,i)=>groups[i%parts].push(structuredClone(t)));
 return groups.map((tensors,index)=>({index,tensors,checksum:hash({index,tensors})}));
}
export function verifyShard(s:WeightShard):boolean{return s.checksum===hash({index:s.index,tensors:s.tensors})&&s.tensors.every(t=>t.data.length===t.shape.reduce((a,b)=>a*b,1)&&t.data.every(Number.isFinite));}
export function assembleTensors(shards:WeightShard[],template:ModelWeights):ModelWeights {
 if(!shards.length||shards.some(s=>!verifyShard(s)))throw new Error("Invalid or tampered weight shard");
 const tensors=shards.flatMap(s=>s.tensors).sort((a,b)=>template.tensors.findIndex(t=>t.name===a.name)-template.tensors.findIndex(t=>t.name===b.name));
 if(tensors.length!==template.tensors.length||tensors.some((t,i)=>t.name!==template.tensors[i]?.name||JSON.stringify(t.shape)!==JSON.stringify(template.tensors[i]?.shape)))throw new Error("Shard set does not match target architecture");
 return {...template,tensors};
}
export function validateWeights(m:ModelWeights):{valid:boolean;errors:string[]} {
 const errors:string[]=[]; if(m.format!=="daisy-tensors-v1")errors.push("Unsupported model format");
 const names=new Set<string>(); for(const t of m.tensors){if(names.has(t.name))errors.push(`Duplicate tensor ${t.name}`);names.add(t.name);if(t.data.length!==t.shape.reduce((a,b)=>a*b,1)||t.data.some(v=>!Number.isFinite(v)))errors.push(`Invalid tensor ${t.name}`);}
 if(!m.tensors.length)errors.push("No tensors"); return {valid:errors.length===0,errors};
}
export const verifyTensorDigest=(t:Tensor,digest:string)=>tensorDigest(t)===digest;
