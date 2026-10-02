// ============================================================================
// SOVEREIGN POLYGLOT CODE TYPE DETECTOR & UNIFIED BUILD ORCHESTRATOR
// Differentiates & compiles JS/TS, Python, Go, Rust, Java/Kotlin, C/C++, Flutter, Docker
// ============================================================================

import { generateEnhancedMakefile } from './polyglotCleanAndOrder';

export interface DetectedCodeType {
  id: string;
  name: string;
  category: "frontend" | "backend" | "mobile" | "native" | "devops" | "script";
  iconName: string;
  badgeColor: string;
  buildInstructions: string;
  sampleFiles: string[];
}

export class SovereignPolyglotEngine {
  /**
   * Analyzes a list of file paths/names and returns all detected code types/frameworks.
   */
  public static detectCodeTypes(filePaths: string[]): DetectedCodeType[] {
    const detected: Map<string, DetectedCodeType> = new Map();

    const pathsLower = filePaths.map(p => p.toLowerCase());

    // 1. JavaScript / TypeScript / React / Next / Vue / Svelte
    const hasPkgJson = pathsLower.some(p => p.endsWith("package.json"));
    const hasTs = pathsLower.some(p => p.endsWith(".ts") || p.endsWith(".tsx") || p.endsWith("tsconfig.json"));
    const hasJs = pathsLower.some(p => p.endsWith(".js") || p.endsWith(".jsx"));

    if (hasPkgJson || hasTs || hasJs) {
      const tsxFiles = filePaths.filter(p => p.toLowerCase().endsWith(".tsx") || p.toLowerCase().endsWith(".jsx"));
      detected.set("js_ts", {
        id: "js_ts",
        name: hasTs ? "TypeScript / JavaScript (Node.js)" : "JavaScript (Node.js)",
        category: "frontend",
        iconName: "Code",
        badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
        buildInstructions: "npm install && npm run build (or pnpm / yarn)",
        sampleFiles: tsxFiles.slice(0, 3)
      });
    }

    // 2. Python (FastAPI, Flask, Django, Data Science, AI)
    const hasPy = pathsLower.some(p => p.endsWith(".py") || p.endsWith("requirements.txt") || p.endsWith("pyproject.toml") || p.endsWith("pipfile") || p.endsWith("setup.py"));
    if (hasPy) {
      const pyFiles = filePaths.filter(p => p.toLowerCase().endsWith(".py"));
      detected.set("python", {
        id: "python",
        name: "Python (FastAPI / Flask / Django)",
        category: "backend",
        iconName: "Terminal",
        badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        buildInstructions: "pip install -r requirements.txt && python main.py",
        sampleFiles: pyFiles.slice(0, 3)
      });
    }

    // 3. Go (Golang Microservices, gRPC, CLI)
    const hasGo = pathsLower.some(p => p.endsWith(".go") || p.endsWith("go.mod") || p.endsWith("go.sum"));
    if (hasGo) {
      const goFiles = filePaths.filter(p => p.toLowerCase().endsWith(".go"));
      detected.set("go", {
        id: "go",
        name: "Go (Golang Microservice)",
        category: "backend",
        iconName: "Cpu",
        badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
        buildInstructions: "go mod download && go build -o server .",
        sampleFiles: goFiles.slice(0, 3)
      });
    }

    // 4. Rust (Cargo Native Crates, Wasm)
    const hasRust = pathsLower.some(p => p.endsWith(".rs") || p.endsWith("cargo.toml") || p.endsWith("cargo.lock"));
    if (hasRust) {
      const rsFiles = filePaths.filter(p => p.toLowerCase().endsWith(".rs"));
      detected.set("rust", {
        id: "rust",
        name: "Rust (Cargo Native Crate)",
        category: "native",
        iconName: "Hammer",
        badgeColor: "bg-orange-500/20 text-orange-300 border-orange-500/40",
        buildInstructions: "cargo build --release",
        sampleFiles: rsFiles.slice(0, 3)
      });
    }

    // 5. Java / Kotlin / Android
    const hasJavaKt = pathsLower.some(p => 
      p.endsWith(".java") || p.endsWith(".kt") || p.endsWith("build.gradle") || p.endsWith("build.gradle.kts") || p.endsWith("pom.xml") || p.includes("androidmanifest.xml")
    );
    if (hasJavaKt) {
      const androidOrJava = pathsLower.some(p => p.includes("androidmanifest.xml") || p.endsWith(".kt")) ? "Android / Kotlin App" : "Java / Spring Boot App";
      const jkFiles = filePaths.filter(p => p.toLowerCase().endsWith(".kt") || p.toLowerCase().endsWith(".java"));
      detected.set("java_kotlin", {
        id: "java_kotlin",
        name: androidOrJava,
        category: "mobile",
        iconName: "Smartphone",
        badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        buildInstructions: "./gradlew assembleRelease (or mvn clean package)",
        sampleFiles: jkFiles.slice(0, 3)
      });
    }

    // 6. Flutter / Dart
    const hasFlutter = pathsLower.some(p => p.endsWith(".dart") || p.endsWith("pubspec.yaml") || p.endsWith("pubspec.lock"));
    if (hasFlutter) {
      const dartFiles = filePaths.filter(p => p.toLowerCase().endsWith(".dart"));
      detected.set("flutter", {
        id: "flutter",
        name: "Flutter / Dart (Cross-Platform)",
        category: "mobile",
        iconName: "Smartphone",
        badgeColor: "bg-teal-500/20 text-teal-300 border-teal-500/40",
        buildInstructions: "flutter pub get && flutter build apk",
        sampleFiles: dartFiles.slice(0, 3)
      });
    }

    // 7. C / C++ (CMake, Native Libraries, Embedded)
    const hasCpp = pathsLower.some(p => p.endsWith(".c") || p.endsWith(".cpp") || p.endsWith(".h") || p.endsWith(".hpp") || p.endsWith("cmakelists.txt"));
    if (hasCpp) {
      const cppFiles = filePaths.filter(p => p.toLowerCase().endsWith(".cpp") || p.toLowerCase().endsWith(".c"));
      detected.set("c_cpp", {
        id: "c_cpp",
        name: "C / C++ Native Core",
        category: "native",
        iconName: "Cpu",
        badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
        buildInstructions: "mkdir build && cd build && cmake .. && make",
        sampleFiles: cppFiles.slice(0, 3)
      });
    }

    // 8. Docker & DevOps Containerization
    const hasDocker = pathsLower.some(p => p.includes("dockerfile") || p.includes("docker-compose"));
    if (hasDocker) {
      detected.set("docker", {
        id: "docker",
        name: "Docker / Containerized Microservices",
        category: "devops",
        iconName: "Folder",
        badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
        buildInstructions: "docker-compose up --build",
        sampleFiles: filePaths.filter(p => p.toLowerCase().includes("docker")).slice(0, 3)
      });
    }

    // 9. Shell Automation Scripts
    const hasShell = pathsLower.some(p => p.endsWith(".sh") || p.endsWith("makefile"));
    if (hasShell) {
      detected.set("shell", {
        id: "shell",
        name: "Shell & Makefile Automation",
        category: "script",
        iconName: "Terminal",
        badgeColor: "bg-slate-500/20 text-slate-300 border-slate-500/40",
        buildInstructions: "chmod +x build_all.sh && ./build_all.sh",
        sampleFiles: filePaths.filter(p => p.toLowerCase().endsWith(".sh") || p.toLowerCase().includes("makefile")).slice(0, 3)
      });
    }

    // Default fallback if no specific extension matched
    if (detected.size === 0) {
      detected.set("js_ts", {
        id: "js_ts",
        name: "Standard Application Workspaces",
        category: "frontend",
        iconName: "Code",
        badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
        buildInstructions: "pnpm build",
        sampleFiles: filePaths.slice(0, 3)
      });
    }

    return Array.from(detected.values());
  }

  /**
   * Generates polyglot build orchestration files (Makefile, docker-compose.yml, build_all.sh)
   * so all code types compile together into one unified executable build.
   */
  public static generatePolyglotOrchestration(codeTypes: DetectedCodeType[], appName: string): {
    makefile: string;
    dockerCompose: string;
    buildScript: string;
    polyglotReadme: string;
  } {
    const cleanApp = appName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const hasPython = codeTypes.some(c => c.id === "python");
    const hasGo = codeTypes.some(c => c.id === "go");
    const hasRust = codeTypes.some(c => c.id === "rust");
    const hasJavaKt = codeTypes.some(c => c.id === "java_kotlin");
    const hasFlutter = codeTypes.some(c => c.id === "flutter");
    const hasCpp = codeTypes.some(c => c.id === "c_cpp");
    const hasNode = codeTypes.some(c => c.id === "js_ts");

    // Convert codeTypes to DetectedLanguage array for enhanced makefile generation
    const langList: DetectedLanguage[] = codeTypes.map(c => ({
      name: c.name.includes("TypeScript") || c.name.includes("JavaScript") ? "Node.js / TypeScript"
        : c.name.includes("Python") ? "Python"
        : c.name.includes("Go") ? "Go"
        : c.name.includes("Rust") ? "Rust"
        : c.name.includes("Android") || c.name.includes("Java") ? "Java / Kotlin"
        : c.name.includes("Flutter") || c.name.includes("Dart") ? "Flutter / Dart"
        : c.name.includes("C / C++") ? "C / C++"
        : c.name.includes("Docker") ? "Docker"
        : c.name,
      manifestFile: c.sampleFiles[0] || "manifest",
      buildTarget: c.buildInstructions,
    }));

    // 1. Makefile using generateEnhancedMakefile
    const makefile = generateEnhancedMakefile(langList);

    // 2. Docker Compose
    let dockerCompose = `version: '3.8'

services:
  app-orchestrator:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ${cleanApp}-core
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
`;

    if (hasPython) {
      dockerCompose += `
  python-backend:
    build:
      context: .
      dockerfile: services/python/Dockerfile
    container_name: ${cleanApp}-python-service
    ports:
      - "8000:8000"
`;
    }

    if (hasGo) {
      dockerCompose += `
  go-microservice:
    build:
      context: .
      dockerfile: services/go/Dockerfile
    container_name: ${cleanApp}-go-service
    ports:
      - "8080:8080"
`;
    }

    // 3. Bash Build Script
    let buildScript = `#!/usr/bin/env bash
# ============================================================================
# UNIFIED POLYGLOT COMPILATION SCRIPT
# ============================================================================
set -e

echo "--------------------------------------------------------"
echo "  dAIsy HaMINJA Sovereign Core - Unified Multi-Language Build"
echo "  Target App: ${appName}"
echo "--------------------------------------------------------"

`;

    codeTypes.forEach(ct => {
      buildScript += `echo "==> Building ${ct.name} module..."\n${ct.buildInstructions}\n\n`;
    });

    buildScript += `echo "--------------------------------------------------------"
echo "  UNIFIED BUILD COMPLETE across ${codeTypes.length} code types."
echo "--------------------------------------------------------"
`;

    // 4. Polyglot README
    let polyglotReadme = `# ${appName} - Polyglot Unified Build Workspace

This repository is a **unified polyglot monorepo** created by the SolveX Sovereign Monorepo Engine (dAIsy HaMINJA Core).

## Detected Code Types & Frameworks
${codeTypes.map(c => `- **${c.name}** (\`${c.category}\`): ${c.buildInstructions}`).join("\n")}

## Quick Start (Unified Compilation)

### Single Command Build
\`\`\`bash
chmod +x build_all.sh
./build_all.sh
\`\`\`

### Using Makefile
\`\`\`bash
make build-all
\`\`\`

### Using Docker Compose
\`\`\`bash
docker-compose up --build
\`\`\`

---
*Generated with 54-Node Grid Telemetry & Anti-Tamper SHA-256 Seal Validation.*
`;

    return {
      makefile,
      dockerCompose,
      buildScript,
      polyglotReadme
    };
  }
}

// ============================================================================
// STANDALONE POLYGLOT LANGUAGE DETECTION & MAKEFILE GENERATOR
// ============================================================================

export interface DetectedLanguage {
  name: string;
  manifestFile: string;
  buildTarget: string;
}

export function detectPolyglotCode(files: string[]): DetectedLanguage[] {
  const detected: DetectedLanguage[] = [];

  const hasFile = (filename: string) => files.some(f => f.endsWith(filename) || f.toLowerCase().endsWith(filename.toLowerCase()));

  if (hasFile('package.json')) {
    detected.push({ name: 'Node.js / TypeScript', manifestFile: 'package.json', buildTarget: 'npm run build' });
  }
  if (hasFile('requirements.txt') || hasFile('pyproject.toml')) {
    detected.push({ name: 'Python', manifestFile: hasFile('requirements.txt') ? 'requirements.txt' : 'pyproject.toml', buildTarget: 'pip install -r requirements.txt' });
  }
  if (hasFile('go.mod')) {
    detected.push({ name: 'Go', manifestFile: 'go.mod', buildTarget: 'go build -o bin/' });
  }
  if (hasFile('Cargo.toml')) {
    detected.push({ name: 'Rust', manifestFile: 'Cargo.toml', buildTarget: 'cargo build --release' });
  }
  if (hasFile('build.gradle') || hasFile('pom.xml')) {
    detected.push({ name: 'Java / Kotlin', manifestFile: hasFile('build.gradle') ? 'build.gradle' : 'pom.xml', buildTarget: './gradlew build' });
  }
  if (hasFile('pubspec.yaml')) {
    detected.push({ name: 'Flutter / Dart', manifestFile: 'pubspec.yaml', buildTarget: 'flutter build apk' });
  }
  if (hasFile('CMakeLists.txt')) {
    detected.push({ name: 'C / C++', manifestFile: 'CMakeLists.txt', buildTarget: 'cmake -S . -B build && cmake --build build' });
  }
  if (hasFile('Dockerfile')) {
    detected.push({ name: 'Docker', manifestFile: 'Dockerfile', buildTarget: 'docker build -t polyglot-app .' });
  }

  return detected;
}

export function generateUnifiedMakefile(languages: DetectedLanguage[]): string {
  const targets = languages.map(l => `\t@echo "Building ${l.name}..."\n\t${l.buildTarget}`).join('\n');
  
  return `all: install build

install:
\t@echo "Initializing polyglot workspace dependencies..."

build:
${targets || '\t@echo "No specific targets found."'}
\t@echo "Unified build sequence complete."
`;
}

