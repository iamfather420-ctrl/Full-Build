export interface ArchitectureSpec { name:string; family:"mlp-classifier"; inputSize:number; hiddenSizes:number[]; outputSize:number; seed?:number; }
export interface TensorSpec { name:string; shape:number[]; }
export function validateArchitecture(a:ArchitectureSpec):void {
 if(!a.name || a.family!=="mlp-classifier" || !Number.isInteger(a.inputSize)||a.inputSize<1 || !Number.isInteger(a.outputSize)||a.outputSize<1 || !Array.isArray(a.hiddenSizes)||a.hiddenSizes.length===0 || a.hiddenSizes.some(n=>!Number.isInteger(n)||n<1)) throw new Error("Invalid architecture specification");
}
export function tensorSpecs(a:ArchitectureSpec):TensorSpec[] {
 validateArchitecture(a); const dims=[a.inputSize,...a.hiddenSizes,a.outputSize]; const out:TensorSpec[]=[];
 for(let i=0;i<dims.length-1;i++){out.push({name:`layers.${i}.weights`,shape:[dims[i+1],dims[i]]},{name:`layers.${i}.bias`,shape:[dims[i+1]]});} return out;
}
export const kernelLayers=(a:ArchitectureSpec)=>tensorSpecs(a);
