import { createHash } from "node:crypto";
import { ArchitectureSpec, tensorSpecs, validateArchitecture } from "./architecture.js";
export interface Tensor { name:string; shape:number[]; data:number[]; }
export interface ModelWeights { format:"daisy-tensors-v1"; architecture:ArchitectureSpec; tensors:Tensor[]; metadata:{createdAt:string; trainedSteps:number; loss:number|null}; }
export function loadKernel(a:ArchitectureSpec):ModelWeights {
 validateArchitecture(a); let state=(a.seed??20261115)>>>0;
 const rand=()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296;};
 const tensors=tensorSpecs(a).map(s=>({name:s.name,shape:s.shape,data:Array.from({length:s.shape.reduce((x,y)=>x*y,1)},()=> (rand()*2-1)*Math.sqrt(2/(s.shape.at(-1)??1)))}));
 return {format:"daisy-tensors-v1",architecture:a,tensors,metadata:{createdAt:new Date().toISOString(),trainedSteps:0,loss:null}};
}
export const tensorDigest=(t:Tensor)=>createHash("sha256").update(JSON.stringify(t)).digest("hex");
