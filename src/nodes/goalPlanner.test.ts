import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planGoal } from './goalPlanner.ts';

test('orders dependencies before dependents',()=>{const p=planGoal('release',[{id:'release',description:'Release',dependsOn:['tests','audit']},{id:'tests',description:'Test'},{id:'audit',description:'Audit',dependsOn:['tests']}]);assert.deepEqual(p.orderedTasks.map(x=>x.id),['tests','audit','release']);});
test('rejects unknown dependencies and cycles',()=>{assert.throws(()=>planGoal('x',[{id:'a',description:'A',dependsOn:['missing']}]),/Unknown dependency/);assert.throws(()=>planGoal('x',[{id:'a',description:'A',dependsOn:['b']},{id:'b',description:'B',dependsOn:['a']}]),/cycle detected/);});
test('rejects empty goals and duplicate task ids',()=>{assert.throws(()=>planGoal('',[{id:'a',description:'A'}]),/goal/);assert.throws(()=>planGoal('x',[{id:'a',description:'A'},{id:'a',description:'Again'}]),/Duplicate task id/);});
