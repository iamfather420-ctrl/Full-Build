import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

export interface ExtractedBinaryPayload {
  packageName: string;
  assetsDir: string;
  sourceFiles: { path: string; content: string }[];
}

/**
 * Ingests a binary package (APK/ZIP container), extracts web assets, 
 * manifest files, and maps them into ingestible monorepo source formats.
 */
export async function processBinaryPackage(filePath: string, outputDir: string): Promise<ExtractedBinaryPayload> {
  const zip = new AdmZip(filePath);
  const zipEntries = zip.getEntries();

  const sourceFiles: { path: string; content: string }[] = [];
  let packageName = 'com.solvex.imported.binary';

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const entry of zipEntries) {
    const entryName = entry.entryName;

    // Extract bundled web assets (HTML/JS/CSS if it's a hybrid/Capacitor/Cordova/WebView app)
    if (entryName.startsWith('assets/') || entryName.endsWith('.js') || entryName.endsWith('.html')) {
      const targetPath = path.join(outputDir, entryName);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, entry.getData());

      sourceFiles.push({
        path: entryName,
        content: entry.getData().toString('utf8')
      });
    }

    // Isolate bytecode or manifest indicators if available
    if (entryName === 'classes.dex') {
      const dexPath = path.join(outputDir, 'classes.dex');
      fs.writeFileSync(dexPath, entry.getData());
    }
  }

  return {
    packageName,
    assetsDir: outputDir,
    sourceFiles
  };
}
