import { Finding, Severity, WEIGHTS } from './contracts.js';
export function scoreFindings(findings:Finding[]){
  const inScope=findings.filter(f=>f.status!=='NOT_REQUIRED').reduce((sum,f)=>sum+WEIGHTS[f.severity],0);
  const complete=findings.filter(f=>f.status==='VERIFIED_COMPLETE').reduce((sum,f)=>sum+WEIGHTS[f.severity],0);
  const counts:Record<Severity,number>={Critical:0,High:0,Medium:0,Low:0};
  for(const f of findings)counts[f.severity]++;
  return {weightInScope:inScope,weightComplete:complete,score:inScope?Math.round(complete/inScope*100):0,counts};
}
