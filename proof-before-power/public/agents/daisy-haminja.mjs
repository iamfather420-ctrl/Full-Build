import { beforeToolCall } from "../adapters/before-tool-call.mjs";
import { compileIntent } from "../engine/proof-engine.mjs";

export const DAISY = {
  name: "Daisy Haminja",
  role: "proposer",
  rule: "I may propose a tool call. I may not run it, and I do not grade the proof.",
};

export function proposeToolCall(intent) {
  const action = compileIntent(intent);
  return {
    caller: "daisy.haminja",
    name: action.operation,
    input: intent,
  };
}

export function daisyAct(intent, ctx = {}, toolRunner) {
  const toolCall = proposeToolCall(intent);
  const gate = beforeToolCall(toolCall, {
    policy: ctx.policy,
    now: ctx.now,
    auth: ctx.auth || null,
    host: ctx.host,
  });
  const transcript = [
    `${DAISY.name}: I propose ${toolCall.name}.`,
    `input: ${intent}`,
    `gate: ${gate.proof.decision} in ${gate.gateMs}ms`,
  ];
  if (!gate.proceed) {
    transcript.push("tool: not invoked");
    transcript.push(gate.rejected
      ? "Daisy Haminja: I cannot carry authority fields. The host rejected them."
      : "Daisy Haminja: A countermodel exists. I will not pretend this ran.");
    return { speaker: DAISY.name, toolCall, gate, toolRan: false, transcript, result: null };
  }
  if (typeof toolRunner !== "function") {
    transcript.push("tool: runner missing, fail closed");
    transcript.push("Daisy Haminja: The gate allowed this scope, but no runner was bound. I did not apply a result.");
    return { speaker: DAISY.name, toolCall, gate, toolRan: false, transcript, result: null, failClosed: true };
  }
  const result = toolRunner(gate.action);
  transcript.push("tool: invoked in scope");
  transcript.push(`Daisy Haminja: The gate allowed this scope. Result ${result.status}.`);
  return { speaker: DAISY.name, toolCall, gate, toolRan: true, transcript, result };
}
