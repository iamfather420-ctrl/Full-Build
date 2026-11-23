import { describe, expect, it } from 'vitest';
import { RULES, WEIGHTS } from './contracts.js';

describe('readiness rule catalog',()=>{
  it('contains the 25 declared deterministic repository rules',()=>expect(RULES).toHaveLength(25));
  it('uses fixed severity weights',()=>expect(WEIGHTS).toEqual({Critical:10,High:6,Medium:3,Low:1}));
  it('has stable unique titles and valid severities',()=>{
    const titles=RULES.map(([title])=>title);
    expect(new Set(titles).size).toBe(25);
    for(const [, , severity] of RULES) expect(['Critical','High','Medium','Low']).toContain(severity);
  });
  it('has nonempty evidence path candidates except controls explicitly blocked without settings access',()=>{
    RULES.forEach(([, , , candidates],i)=>{if(i!==24)expect(candidates.length).toBeGreaterThan(0);});
  });
});
