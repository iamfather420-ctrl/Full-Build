import { ArchitectureSpec, tensorSpecs } from "./architecture.js";
export interface BuildPlan { architecture:ArchitectureSpec; tensors:{name:string;shape:number[];elements:number;shard:number}[]; totalParameters:number; }
export function planBuild(architecture:ArchitectureSpec,shardCount=1):BuildPlan {
 if(!Number.isInteger(shardCount)||shardCount<1)throw new Error("shardCount must be a positive integer");
 const tensors=tensorSpecs(architecture).map((t,i)=>({...t,elements:t.shape.reduce((a,b)=>a*b,1),shard:i%shardCount}));
 return {architecture,tensors,totalParameters:tensors.reduce((n,t)=>n+t.elements,0)};
}
