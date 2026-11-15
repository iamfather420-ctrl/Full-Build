import { ModelWeights, Tensor } from "./kernel.js";
export interface Sample { input:number[]; target:number[]; }
export function generateDataset(count=128,inputSize=2,outputSize=1,seed=7):Sample[] {
 if(count<1||inputSize<1||outputSize<1)throw new Error("Dataset dimensions must be positive");
 let s=seed>>>0;const r=()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};
 return Array.from({length:count},()=>{const input=Array.from({length:inputSize},()=>r()*2-1);const sum=input.reduce((a,b)=>a+b,0);return {input,target:Array.from({length:outputSize},(_,i)=>Math.tanh(sum*(i+1)/inputSize))};});
}
function forward(m:ModelWeights,x:number[]):number[][] {
 const activations=[x]; let a=x;
 for(let l=0;l<m.tensors.length/2;l++){const w=m.tensors.find(t=>t.name===`layers.${l}.weights`)!,b=m.tensors.find(t=>t.name===`layers.${l}.bias`)!;a=b.data.map((v,j)=>{let z=v;for(let k=0;k<a.length;k++)z+=w.data[j*a.length+k]*a[k];return l===m.tensors.length/2-1?z:Math.tanh(z);});activations.push(a);}
 return activations;
}
export function evaluate(m:ModelWeights,data:Sample[]):number {
 if(!data.length)throw new Error("Evaluation dataset is empty");
 return data.reduce((sum,s)=>{const y=forward(m,s.input).at(-1)!;return sum+y.reduce((v,p,i)=>v+(p-s.target[i])**2,0)/y.length;},0)/data.length;
}
export function applySgd(m:ModelWeights,data:Sample[],learningRate=.03,epochs=1):ModelWeights {
 if(!(learningRate>0)||!Number.isFinite(learningRate)||!Number.isInteger(epochs)||epochs<1)throw new Error("Invalid SGD parameters");
 const layers=m.tensors.length/2;
 for(let epoch=0;epoch<epochs;epoch++)for(const sample of data){
  const acts=forward(m,sample.input),deltas:number[][]=Array(layers);
  const out=acts[layers];deltas[layers-1]=out.map((v,i)=>2*(v-sample.target[i])/out.length);
  for(let l=layers-2;l>=0;l--){const w=m.tensors.find(t=>t.name===`layers.${l+1}.weights`)!;deltas[l]=acts[l+1].map((v,j)=>{let g=0;for(let k=0;k<deltas[l+1].length;k++)g+=w.data[k*v.length+j]*deltas[l+1][k];return g*(1-v*v);});}
  for(let l=0;l<layers;l++){const w=m.tensors.find(t=>t.name===`layers.${l}.weights`)!,b=m.tensors.find(t=>t.name===`layers.${l}.bias`)!;for(let j=0;j<deltas[l].length;j++){b.data[j]-=learningRate*deltas[l][j];for(let k=0;k<acts[l].length;k++)w.data[j*acts[l].length+k]-=learningRate*deltas[l][j]*acts[l][k];}}
 }
 return {...m,metadata:{...m.metadata,trainedSteps:m.metadata.trainedSteps+epochs*data.length,loss:evaluate(m,data)}};
}
export function buildBatchPayload(data:Sample[],batchSize=16):Sample[][] {
 if(!Number.isInteger(batchSize)||batchSize<1)throw new Error("batchSize must be positive");
 const batches:Sample[][]=[];for(let i=0;i<data.length;i+=batchSize)batches.push(data.slice(i,i+batchSize));return batches;
}
export function reduceGradients(parts:number[][][]):number[][] {
 if(!parts.length)throw new Error("No gradients to reduce");const n=parts[0].length;if(parts.some(p=>p.length!==n||p.some((r,i)=>r.length!==parts[0][i].length)))throw new Error("Gradient shapes differ");
 return parts[0].map((r,i)=>r.map((_,j)=>parts.reduce((s,p)=>s+p[i][j],0)/parts.length));
}
