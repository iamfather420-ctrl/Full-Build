import { mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { LearningBubble, LearningBubbleStore } from './LearningBubbleRegistry.ts';

/** Local file persistence. This is not the live Neon registry. */
export class FileLearningBubbleStore implements LearningBubbleStore {
  constructor(private readonly directory: string) {
    mkdirSync(directory, { recursive: true });
  }

  get(id: string): LearningBubble | undefined {
    try {
      return JSON.parse(readFileSync(this.file(id), 'utf8')) as LearningBubble;
    } catch {
      return undefined;
    }
  }

  put(bubble: LearningBubble): void {
    const target = this.file(bubble.bubble_id);
    const temporary = `${target}.${process.pid}.tmp`;
    writeFileSync(temporary, JSON.stringify(bubble));
    renameSync(temporary, target);
  }

  list(): LearningBubble[] {
    return readdirSync(this.directory)
      .filter((name) => name.endsWith('.json'))
      .map((name) => JSON.parse(readFileSync(path.join(this.directory, name), 'utf8')) as LearningBubble);
  }

  private file(id: string): string {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Learning Bubble id is not a UUID.');
    return path.join(this.directory, `${id}.json`);
  }
}
