import { readFileSync } from 'node:fs';

const reportPath = process.argv[2] ?? 'npm-audit.json';
let report;
try {
  report = JSON.parse(readFileSync(reportPath, 'utf8'));
} catch (error) {
  console.error(`Could not read npm audit report at ${reportPath}:`, error.message);
  process.exit(1);
}

const counts = report.metadata?.vulnerabilities ?? {};
console.log('NPM dependency audit summary');
console.log(JSON.stringify({
  totals: {
    info: counts.info ?? 0,
    low: counts.low ?? 0,
    moderate: counts.moderate ?? 0,
    high: counts.high ?? 0,
    critical: counts.critical ?? 0,
    total: counts.total ?? 0,
  },
}, null, 2));

const advisories = Object.entries(report.vulnerabilities ?? {});
if (advisories.length === 0) {
  console.log('No vulnerable packages were reported by npm audit.');
} else {
  for (const [name, item] of advisories) {
    console.log(JSON.stringify({
      package: name,
      severity: item.severity,
      direct: item.isDirect,
      installedRange: item.range,
      fixAvailable: item.fixAvailable ?? false,
      via: (item.via ?? []).map((entry) =>
        typeof entry === 'string'
          ? entry
          : { name: entry.name, title: entry.title, url: entry.url, range: entry.range }
      ),
    }));
  }
}
