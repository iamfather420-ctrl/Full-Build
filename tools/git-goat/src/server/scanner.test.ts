import { describe, expect, it } from 'vitest';
import { contentSkipReason, prioritizeForInspection } from './scanner.js';

describe('full-tree content inspection planner', () => {
  it('plans small source and unknown text files for inspection', () => {
    expect(contentSkipReason({ path: 'src/main.ts', size: 512 }, 0, 0)).toBeUndefined();
    expect(contentSkipReason({ path: 'LICENSE', size: 100 }, 0, 0)).toBeUndefined();
    expect(contentSkipReason({ path: 'assets/custom.unknown', size: 80 }, 0, 0)).toBeUndefined();
  });

  it('inventories binary blobs without fetching them as text', () => {
    expect(contentSkipReason({ path: 'public/logo.png', size: 12_000 }, 0, 0)).toMatch(/Binary\/media\/archive/);
  });

  it('applies per-file, aggregate-byte, and file-count caps explicitly', () => {
    expect(contentSkipReason({ path: 'large.ts', size: 1024 * 1024 + 1 }, 0, 0)).toMatch(/per-file/);
    expect(contentSkipReason({ path: 'small.ts', size: 10 }, 64 * 1024 * 1024, 1)).toMatch(/aggregate/i);
    expect(contentSkipReason({ path: 'small.ts', size: 10 }, 0, 2000)).toMatch(/file cap/);
  });

  it('prioritizes source code, then documentation/configuration, then other text', () => {
    expect(prioritizeForInspection({ path: 'src/app.py' })).toBeLessThan(prioritizeForInspection({ path: 'README.md' }));
    expect(prioritizeForInspection({ path: 'README.md' })).toBeLessThan(prioritizeForInspection({ path: 'data/custom.unknown' }));
  });
});
