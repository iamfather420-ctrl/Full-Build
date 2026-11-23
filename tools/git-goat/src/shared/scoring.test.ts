import { describe,expect,it } from 'vitest';
import { scoreFindings } from './scoring.js';
import type { Finding } from './contracts.js';
const f=(severity:Finding['severity'],status:Finding['status']):Finding=>({id:'x',title:'test',category:'test',status,severity,detail:'evidence',evidence:['test'],nextStep:'test'});
describe('verified completion scoring',()=>{
 it('counts only VERIFIED_COMPLETE in the numerator',()=>{const s=scoreFindings([f('Critical','VERIFIED_COMPLETE'),f('High','REMEDIATION_REQUIRED'),f('Low','NOT RUN')]);expect(s.weightComplete).toBe(10);expect(s.weightInScope).toBe(17);expect(s.score).toBe(59);});
 it('keeps BLOCKED in-scope and excludes only NOT_REQUIRED',()=>{const s=scoreFindings([f('High','BLOCKED'),f('Medium','NOT_REQUIRED'),f('Low','VERIFIED_COMPLETE')]);expect(s.weightComplete).toBe(1);expect(s.weightInScope).toBe(7);expect(s.score).toBe(14);});
 it('returns zero if every requirement is justified NOT_REQUIRED',()=>expect(scoreFindings([f('Low','NOT_REQUIRED')]).score).toBe(0));
});
