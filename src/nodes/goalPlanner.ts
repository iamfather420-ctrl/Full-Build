export interface GoalTask { id: string; description: string; dependsOn?: string[]; }
export interface GoalPlan { goal: string; orderedTasks: Array<{id:string;description:string;dependsOn:string[];sequence:number}>; strategy: 'DEPENDENCY_TOPOLOGICAL_SORT'; }
export function planGoal(goal:string,tasks:GoalTask[]):GoalPlan {
 if(typeof goal!=='string'||!goal.trim()||goal.length>2000) throw new Error('A non-empty goal of at most 2,000 characters is required.');
 if(!Array.isArray(tasks)||tasks.length<1||tasks.length>100) throw new Error('The plan must contain between 1 and 100 tasks.');
 const byId=new Map<string,GoalTask>();
 for(const task of tasks){if(!task||!/^[a-zA-Z0-9_-]{1,64}$/.test(task.id)||typeof task.description!=='string'||!task.description.trim()||task.description.length>500)throw new Error('Every task requires a valid id and description.');if(byId.has(task.id))throw new Error('Duplicate task id: '+task.id);byId.set(task.id,task);}
 for(const task of tasks)for(const dep of task.dependsOn??[]){if(!byId.has(dep))throw new Error('Unknown dependency '+dep+' for task '+task.id);if(dep===task.id)throw new Error('Task '+task.id+' cannot depend on itself.');}
 const pending=new Set(tasks.map(t=>t.id)),done=new Set<string>(),ordered:GoalPlan['orderedTasks']=[];
 while(pending.size){const ready=tasks.filter(t=>pending.has(t.id)&&(t.dependsOn??[]).every(d=>done.has(d)));if(!ready.length)throw new Error('Dependency cycle detected; no safe execution order exists.');for(const t of ready){ordered.push({id:t.id,description:t.description.trim(),dependsOn:[...(t.dependsOn??[])],sequence:ordered.length+1});pending.delete(t.id);done.add(t.id);}}
 return {goal:goal.trim(),orderedTasks:ordered,strategy:'DEPENDENCY_TOPOLOGICAL_SORT'};
}
