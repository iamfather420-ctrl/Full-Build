export type ActorKind = "human" | "partner" | "system";

export type Actor = { id: string; kind: ActorKind };

export const State = {
  PROPOSED: "PROPOSED",
  REVIEWED: "REVIEWED",
  AUTHORIZED: "AUTHORIZED",
  RUNNING: "RUNNING",
  VALIDATING: "VALIDATING",
  COMPLETED: "COMPLETED",
  REJECTED: "REJECTED",
  BLOCKED: "BLOCKED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  RECOVERY_REQUIRED: "RECOVERY_REQUIRED",
} as const;

export type StateName = (typeof State)[keyof typeof State];

export const Risk = { LOW: 1, MEDIUM: 2, HIGH: 3 } as const;
export type RiskName = keyof typeof Risk;

export const GOVERNANCE_TRANSITIONS: Record<StateName, StateName[]> = {
  PROPOSED: ["REVIEWED", "REJECTED", "CANCELLED", "NEEDS_REVIEW"],
  REVIEWED: ["AUTHORIZED", "REJECTED", "CANCELLED", "NEEDS_REVIEW"],
  NEEDS_REVIEW: ["REVIEWED", "REJECTED", "CANCELLED"],
  AUTHORIZED: ["RUNNING", "BLOCKED", "CANCELLED"],
  BLOCKED: ["AUTHORIZED", "CANCELLED"],
  RUNNING: ["VALIDATING", "FAILED", "CANCELLED"],
  VALIDATING: ["COMPLETED", "FAILED", "NEEDS_REVIEW"],
  FAILED: ["RECOVERY_REQUIRED"],
  RECOVERY_REQUIRED: ["AUTHORIZED", "CANCELLED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export type Task = {
  id: string;
  title: string;
  tool: string;
  operation: string;
  risk: RiskName;
  ownerId: string;
  proposer: Actor;
  state: StateName;
  reviewer?: Actor;
  authorizer?: Actor;
  result?: string;
  error?: string;
  blockReason?: string;
};

export type AuditEntry = {
  seq: number;
  taskId: string | null;
  actor: string;
  event: string;
  from?: StateName;
  to?: StateName;
  detail: Record<string, string>;
  prev: string;
  hash: string;
};

function digest(value: unknown) {
  const text = JSON.stringify(value);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export class Lifecycle {
  private tasks = new Map<string, Task>();
  private grants = new Set<string>();
  private tools = new Map<string, { available: boolean; reason: string; validate: boolean }>();
  private entries: AuditEntry[] = [];
  private seq = 0;

  grant(ownerId: string, tool: string, operation: string) {
    this.grants.add(`${ownerId}|${tool}|${operation}`);
  }

  setTool(name: string, available: boolean, reason: string, validate = true) {
    this.tools.set(name, { available, reason, validate });
  }

  private allows(ownerId: string, tool: string, operation: string) {
    return this.grants.has(`${ownerId}|${tool}|${operation}`);
  }

  private audit(taskId: string | null, actor: Actor, event: string, detail: Record<string, string> = {}, from?: StateName, to?: StateName) {
    const prev = this.entries.at(-1)?.hash ?? "0";
    const body = { seq: this.seq++, taskId, actor: actor.id, event, from, to, detail, prev };
    const entry = { ...body, hash: digest(body) };
    this.entries.push(entry);
    return entry;
  }

  private deny(task: Task | null, actor: Actor, reason: string): never {
    this.audit(task?.id ?? null, actor, "denied", { reason });
    throw new Error(reason);
  }

  private move(task: Task, to: StateName, actor: Actor, event: string, detail: Record<string, string> = {}) {
    if (!GOVERNANCE_TRANSITIONS[task.state].includes(to)) {
      this.deny(task, actor, `invalid transition ${task.state}->${to}`);
    }
    const from = task.state;
    task.state = to;
    this.audit(task.id, actor, event, detail, from, to);
  }

  propose(actor: Actor, ownerId: string, title: string, tool: string, operation: string, risk: RiskName) {
    if (!this.tools.has(tool)) this.deny(null, actor, `unknown tool ${tool}`);
    if (!this.allows(ownerId, tool, operation)) this.deny(null, actor, `owner lacks permission for ${tool}.${operation}`);
    const task: Task = {
      id: `task-${this.tasks.size + 1}`,
      title,
      tool,
      operation,
      risk,
      ownerId,
      proposer: actor,
      state: State.PROPOSED,
    };
    this.tasks.set(task.id, task);
    this.audit(task.id, actor, "proposed", { tool, operation, risk });
    if (risk === "LOW") {
      task.reviewer = { id: "policy:auto-low-risk", kind: "system" };
      this.move(task, State.REVIEWED, task.reviewer, "auto_reviewed", { rule: "low-risk policy" });
    }
    return task;
  }

  review(taskId: string, actor: Actor, approve: boolean) {
    const task = this.must(taskId);
    if (actor.kind !== "human") this.deny(task, actor, "only humans may review");
    if (task.risk === "HIGH" && actor.id === task.proposer.id) this.deny(task, actor, "HIGH risk: proposer cannot review own task");
    if (approve) {
      task.reviewer = actor;
      this.move(task, State.REVIEWED, actor, "reviewed");
    } else {
      this.move(task, State.REJECTED, actor, "rejected");
    }
    return task;
  }

  authorize(taskId: string, actor: Actor) {
    const task = this.must(taskId);
    if (!this.allows(task.ownerId, task.tool, task.operation)) this.deny(task, actor, "permission not held");
    if (task.risk !== "LOW") {
      if (actor.kind !== "human") this.deny(task, actor, "MEDIUM+ risk requires a human authorizer");
      if (actor.id !== task.ownerId) this.deny(task, actor, "MEDIUM+ risk must be authorized by the owner");
    }
    if (task.risk === "HIGH" && task.reviewer?.id === actor.id) {
      this.deny(task, actor, "HIGH risk requires reviewer and authorizer to differ");
    }
    task.authorizer = actor;
    this.move(task, State.AUTHORIZED, actor, "authorized", { risk: task.risk });
    return task;
  }

  run(taskId: string, actor: Actor) {
    const task = this.must(taskId);
    if (task.state !== State.AUTHORIZED) this.deny(task, actor, `cannot run from ${task.state}`);
    if (!this.allows(task.ownerId, task.tool, task.operation)) {
      task.blockReason = "permission revoked after authorization";
      this.move(task, State.BLOCKED, actor, "blocked", { reason: task.blockReason });
      return task;
    }
    const tool = this.tools.get(task.tool)!;
    if (!tool.available) {
      task.blockReason = `tool unavailable: ${tool.reason}`;
      this.move(task, State.BLOCKED, actor, "blocked", { reason: task.blockReason });
      return task;
    }
    this.move(task, State.RUNNING, actor, "started", { live: "false" });
    task.result = `demo:${task.tool}.${task.operation}`;
    this.move(task, State.VALIDATING, actor, "executed");
    if (tool.validate) {
      this.move(task, State.COMPLETED, actor, "validated", { details: "independent check passed" });
    } else {
      task.error = "validation failed";
      this.move(task, State.FAILED, actor, "failed", { error: task.error });
    }
    return task;
  }

  must(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`unknown task ${taskId}`);
    return task;
  }

  chainOk() {
    let prev = "0";
    return this.entries.every((entry, i) => {
      const core = { ...entry };
      delete (core as { hash?: string }).hash;
      const ok = entry.seq === i && entry.prev === prev && digest(core) === entry.hash;
      prev = entry.hash;
      return ok;
    });
  }

  log() {
    return this.entries.map((entry) => ({ ...entry }));
  }
}
