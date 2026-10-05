import { AIOSRuntime } from './core.js';

const runtime = new AIOSRuntime();
const [command, ...args] = process.argv.slice(2);

async function main() {
  if (command === 'status' || !command) return console.log(JSON.stringify(runtime.status(), null, 2));
  if (command === 'ask') return console.log((await runtime.ask(args.join(' '))).text);
  if (command === 'remember') return console.log(JSON.stringify(runtime.memory.remember(args.join(' ')), null, 2));
  if (command === 'recall') return console.log(JSON.stringify(runtime.memory.recall(args.join(' ')), null, 2));
  if (command === 'system') return console.log(JSON.stringify(await runtime.tools.call({ name: 'system.info', input: {} }), null, 2));
  if (command === 'grant') { runtime.permissions.grant(args[0] as any); return console.log(JSON.stringify(runtime.status(), null, 2)); }
  console.error('Usage: npm run aios -- status|ask <prompt>|remember <text>|recall <query>|system|grant <permission>'); process.exitCode = 1;
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
