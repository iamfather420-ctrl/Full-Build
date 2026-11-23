export type CreativityMode = 'GENERATIVE'|'EXPLORATORY'|'ANALYTICAL'|'SYNTHETIC'|'SIMULATIVE'|'EXECUTABLE';
export type EvidenceLabel = 'VERIFIED'|'PROPOSED'|'HYPOTHESIS'|'SIMULATED'|'UNVERIFIED';
export type PolicyAssessment = 'PASS'|'FAIL'|'UNKNOWN';
export type CreativeDecision = 'ALLOW'|'REVIEW_REQUIRED'|'BLOCKED';
export interface CreativeEvidenceReference { kind:'SOURCE'|'TEST'|'EXECUTION'|'DEPLOYMENT'|'HUMAN_REVIEW'; id:string; uri?:string; }
export interface CreativeIntegrityRequest {
 task:string; output:string; mode:CreativityMode; evidenceLabel:EvidenceLabel; audience:string; domain:string;
 assessments:{taskRelevance:PolicyAssessment;contextualAppropriateness:PolicyAssessment;safety:PolicyAssessment;evidenceIntegrity:PolicyAssessment};
 evidence?:CreativeEvidenceReference[]; simulationDeclared?:boolean; claimsActualExecution?:boolean; executionAuthorized?:boolean;
}
export interface CreativeIntegrityResult {protocol:'CICAP';version:'1.0.0';decision:CreativeDecision;evidenceLabel:EvidenceLabel;reasons:string[];}
const keys=['taskRelevance','contextualAppropriateness','safety','evidenceIntegrity'] as const;
const nonblank=(v:unknown):v is string=>typeof v==='string'&&v.trim().length>0;
export function evaluateCreativeIntegrity(request:CreativeIntegrityRequest):CreativeIntegrityResult {
 const label=request?.evidenceLabel??'UNVERIFIED';
 const blocked=(reason:string):CreativeIntegrityResult=>({protocol:'CICAP',version:'1.0.0',decision:'BLOCKED',evidenceLabel:label,reasons:[reason]});
 if(!request||!nonblank(request.task)||!nonblank(request.output)) return blocked('A concrete task and non-empty output are required.');
 if(!nonblank(request.audience)||!nonblank(request.domain)) return blocked('Audience and domain context are required.');
 if(request.mode==='EXECUTABLE'&&request.executionAuthorized!==true) return blocked('Executable work requires explicit authorization.');
 const evidence=Array.isArray(request.evidence)?request.evidence:[];
 if(label==='VERIFIED'&&(request.assessments?.evidenceIntegrity!=='PASS'||evidence.length===0)) return blocked('VERIFIED output requires passing evidence assessment and evidence references.');
 if(label==='SIMULATED'&&(request.simulationDeclared!==true||request.claimsActualExecution===true)) return blocked('SIMULATED output must be declared and cannot claim real execution.');
 if(request.claimsActualExecution===true&&!evidence.some(e=>['EXECUTION','DEPLOYMENT','TEST'].includes(e.kind))) return blocked('Execution, testing, or deployment claims require matching evidence.');
 const reasons:string[]=[];
 for(const key of keys){const value=request.assessments?.[key]??'UNKNOWN';if(value==='FAIL')return blocked(`The ${key} assessment failed.`);if(value!=='PASS')reasons.push(`${key} has not been positively established.`);}
 return reasons.length?{protocol:'CICAP',version:'1.0.0',decision:'REVIEW_REQUIRED',evidenceLabel:label,reasons}:{protocol:'CICAP',version:'1.0.0',decision:'ALLOW',evidenceLabel:label,reasons:['All required assessments passed.']};
}
