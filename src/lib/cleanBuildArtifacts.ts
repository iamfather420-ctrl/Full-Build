import fs from 'fs';
import path from 'path';

export function cleanBuildArtifacts(projectRoot: string) {
  const targets = [
    path.join(projectRoot, 'android', 'build'),
    path.join(projectRoot, 'android', 'app', 'build'),
    path.join(projectRoot, 'android', '.gradle'),
    path.join(projectRoot, 'workspace_temp')
  ];

  for (const target of targets) {
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
    }
  }
}
