import { describe,expect,it } from 'vitest';
import { getGuidance } from './guidance.js';
import { RULES } from './contracts.js';
import type { Finding } from './contracts.js';
const finding=(id:string,title='Sample finding',category='Quality'):Finding=>({id,title,category,severity:'Medium',status:'REMEDIATION_REQUIRED',detail:'Observed evidence',evidence:['README.md'],nextStep:'Review evidence'});
describe('repository-agnostic remediation guidance',()=>{
 it('provides a question, multiple-choice options, and actionable steps for all 25 rules',()=>{
  expect(RULES).toHaveLength(25);
  for(let i=0;i<25;i++){const g=getGuidance(finding(`R${String(i+1).padStart(2,'0')}`));expect(g.question.length).toBeGreaterThan(12);expect(g.options.length).toBeGreaterThanOrEqual(2);expect(g.steps.length).toBeGreaterThanOrEqual(3);}
 });
 it('provides dedicated guidance for secret alerts and import analysis',()=>{
  expect(getGuidance(finding('S01')).steps.join(' ').toLowerCase()).toContain('rotate');
  expect(getGuidance(finding('D01')).options.length).toBeGreaterThanOrEqual(2);
 });
 it('gives a safe fallback for unknown future repository findings',()=>{
  const g=getGuidance(finding('FUTURE','Uncatalogued issue','Operations'));
  expect(g.question).toContain('Uncatalogued issue');expect(g.steps.join(' ').toLowerCase()).toContain('rescan');
 });
});
