import type { OperationalState, TaskView } from "./types";

export interface TaskDefinition {
  id: string;
  label: string;
  group: string;
  mutates: boolean;
  destructive: boolean;
  requiresApproval: boolean;
  dependsOn: string[];
  detail: string;
}

export const TASKS: TaskDefinition[] = [
  { id: "scan-only", label: "Scan only without making changes", group: "Scanner", mutates: false, destructive: false, requiresApproval: false, dependsOn: [], detail: "Re-read public repository metadata and recompute scores. Writes nothing." },
  { id: "critical-blockers", label: "Complete critical blockers", group: "Remediation", mutates: false, destructive: false, requiresApproval: true, dependsOn: ["scan-only"], detail: "Re-states blockers that still lack authorization or evidence. Does not invent fixes." },
  { id: "security", label: "Complete security remediation", group: "Remediation", mutates: false, destructive: false, requiresApproval: true, dependsOn: ["scan-only"], detail: "Security changes that rotate secrets, weaken RLS, or open production are refused." },
  { id: "repository-repairs", label: "Complete repository repairs", group: "Remediation", mutates: true, destructive: false, requiresApproval: true, dependsOn: ["scan-only"], detail: "Would require an isolated branch. Git execution stays disabled unless the operator enables it." },
  { id: "integration-wiring", label: "Complete integration wiring", group: "Remediation", mutates: false, destructive: false, requiresApproval: true, dependsOn: ["discover-engine"], detail: "Records whether engines are actually connected. Missing connections stay failed." },
  { id: "database", label: "Complete database work", group: "Remediation", mutates: true, destructive: true, requiresApproval: true, dependsOn: ["scan-only"], detail: "Neon migrations stay unapplied. This task cannot pass by creating a draft schema." },
  { id: "workflows", label: "Complete workflow failures", group: "Remediation", mutates: false, destructive: false, requiresApproval: true, dependsOn: ["scan-only"], detail: "GitHub Actions conclusions are not marked passed unless a run is observed." },
  { id: "infrastructure", label: "Complete infrastructure work", group: "Remediation", mutates: true, destructive: true, requiresApproval: true, dependsOn: ["scan-only"], detail: "Does not create Render, Railway, Vercel, or GPU resources." },
  { id: "discover-engine", label: "Complete Discovery Engine", group: "Daisy", mutates: false, destructive: false, requiresApproval: true, dependsOn: ["scan-only"], detail: "Discovers the language-source repository as a candidate and refuses to admit it as training data." },
  { id: "model-engine", label: "Complete Model Engine", group: "Daisy", mutates: false, destructive: false, requiresApproval: true, dependsOn: ["generate-weights"], detail: "Executes the existing daisy-weight-engine kernel. Does not download a pretrained language model." },
  { id: "training-engine", label: "Complete Training Engine", group: "Daisy", mutates: false, destructive: false, requiresApproval: true, dependsOn: ["generate-weights"], detail: "Runs SGD on the authored seed and records measured loss." },
  { id: "inference-engine", label: "Complete Inference Engine", group: "Daisy", mutates: false, destructive: false, requiresApproval: true, dependsOn: ["generate-weights"], detail: "Generates a token from the trained weights only. The GGUF runtime is not called." },
  { id: "daisy-language", label: "Complete Daisy language and communication", group: "Daisy", mutates: false, destructive: false, requiresApproval: true, dependsOn: ["generate-weights"], detail: "Scores held-out next-token accuracy. Training sentences are not reused as the test." },
  { id: "generate-weights", label: "Record the experimental authored-seed micro-model", group: "Daisy", mutates: false, destructive: false, requiresApproval: true, dependsOn: ["discover-engine"], detail: "Preserves daisy-next-token-micro as EXPERIMENTAL_AUTHORED_SEED_MICRO_MODEL. It does not verify or complete proprietary Daisy weights." },
  { id: "replace-temporary", label: "Replace temporary model dependencies after validation", group: "Daisy", mutates: true, destructive: true, requiresApproval: true, dependsOn: ["generate-weights", "inference-engine", "daisy-language"], detail: "Refuses removal until every acceptance gate passes. The transitional GGUF stays in place." },
  { id: "cross-repo", label: "Complete cross-repository wiring", group: "Ecosystem", mutates: false, destructive: false, requiresApproval: true, dependsOn: ["scan-only", "discover-engine"], detail: "Builds the registry from live probes. Unreadable repositories stay unauthorized." },
  { id: "production-verification", label: "Complete production-readiness verification", group: "Ecosystem", mutates: false, destructive: false, requiresApproval: true, dependsOn: ["scan-only"], detail: "Recomputes weighted and raw scores. Blocked checks remain in the denominator." },
  { id: "complete-outstanding", label: "Complete everything outstanding", group: "Plans", mutates: true, destructive: false, requiresApproval: true, dependsOn: ["generate-weights", "cross-repo", "production-verification"], detail: "Expands to the non-destructive tasks. Destructive and production mutations stay blocked." },
];

const BY_ID = new Map(TASKS.map((task) => [task.id, task]));

export function resolveTasks(selected: readonly string[]): TaskDefinition[] {
  const wanted = new Set<string>();
  const visit = (id: string) => {
    const task = BY_ID.get(id);
    if (!task || wanted.has(id)) return;
    for (const dependency of task.dependsOn) visit(dependency);
    wanted.add(id);
  };
  for (const id of selected) {
    if (id === "complete-outstanding") {
      for (const task of TASKS) {
        if (!task.destructive) visit(task.id);
      }
      continue;
    }
    visit(id);
  }
  return TASKS.filter((task) => wanted.has(task.id));
}

export function taskViews(states: Map<string, { state: OperationalState; detail: string }>): TaskView[] {
  return TASKS.map((task) => {
    const current = states.get(task.id);
    return {
      id: task.id,
      label: task.label,
      group: task.group,
      mutates: task.mutates,
      destructive: task.destructive,
      requiresApproval: task.requiresApproval,
      dependsOn: task.dependsOn,
      state: current?.state ?? "AUTHORIZED",
      detail: current?.detail ?? task.detail,
    };
  });
}
