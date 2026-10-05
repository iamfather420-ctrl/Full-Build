import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(new URL('..', import.meta.url).pathname);
const required = [
  'packaging/linux/install.sh', 'packaging/linux/build-iso.sh', 'packaging/linux/daisy-ai-os.service',
  'packaging/windows/install.ps1', 'packaging/macos/install.sh',
  'packaging/android/settings.gradle.kts', 'packaging/android/app/build.gradle.kts',
  'packaging/android/app/src/main/AndroidManifest.xml', 'packaging/android/app/src/main/java/com/daisy/aios/MainActivity.kt', 'packaging/build-all.sh'
];
for (const file of required) { if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing packaging file: ${file}`); }
for (const file of ['packaging/linux/install.sh', 'packaging/linux/build-iso.sh', 'packaging/macos/install.sh', 'packaging/build-all.sh']) { if ((fs.statSync(path.join(root, file)).mode & 0o111) === 0) throw new Error(`Not executable: ${file}`); }
console.log(`Validated ${required.length} platform packaging files.`);
