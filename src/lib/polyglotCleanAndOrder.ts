// src/lib/polyglotCleanAndOrder.ts

import { DetectedLanguage } from './polyglotDetector';
export { cleanBuildArtifacts } from './cleanBuildArtifacts';

export function generateEnhancedMakefile(languages: DetectedLanguage[]): string {
  // Define explicit build order dependencies (e.g., compile low-level or backend services first)
  const orderedLanguages = [...languages].sort((a, b) => {
    const priority: Record<string, number> = {
      'C / C++': 1,
      'Rust': 2,
      'Go': 3,
      'Java / Kotlin': 4,
      'Python': 5,
      'Node.js / TypeScript': 6,
      'Flutter / Dart': 7,
      'Docker': 8
    };
    return (priority[a.name] || 99) - (priority[b.name] || 99);
  });

  const targetNames = orderedLanguages.map(l => l.name.toLowerCase().replace(/[^a-z0-9]/g, '-'));

  const individualTargets = orderedLanguages.map((l, index) => {
    const targetName = targetNames[index];
    return `build-${targetName}:
\t@echo "========================================"
\t@echo "Building [${l.name}] via ${l.manifestFile}..."
\t@echo "========================================"
\t@export PATH="$PATH:$HOME/.local/bin" && ${l.buildTarget}
`;
  }).join('\n');

  return `SHELL := /bin/bash

.PHONY: all clean install ${targetNames.map(t => `build-${t}`).join(' ')}

all: clean install build

clean:
\t@echo "Cleaning stale build artifacts and directories..."
\t@rm -rf bin/ build/ dist/ .parcel-cache/ *.apk

install:
\t@echo "Validating toolchains and initializing dependencies..."
\t@which cmake cargo go python3 node javac flutter docker || true

build: ${targetNames.map(t => `build-${t}`).join(' ')}
\t@echo "All polyglot build targets executed successfully."

${individualTargets}
`;
}
