export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type RuleStatus = 'VERIFIED_COMPLETE' | 'REMEDIATION_REQUIRED' | 'BLOCKED' | 'NOT RUN' | 'NOT_REQUIRED';
export interface Finding { id:string; title:string; category:string; severity:Severity; status:RuleStatus; detail:string; evidence:string[]; nextStep:string; }
export interface FileInventoryEntry { path:string; size:number|null; contentStatus:'TEXT_INSPECTED'|'NOT_INSPECTED'; reason?:string; }
export interface ScanCoverage {
  inventoryComplete:boolean;
  totalFiles:number;
  totalBytes:number;
  contentInspected:number;
  contentOmitted:number;
  contentBytes:number;
  exclusionsTruncated:boolean;
  inventoryEntriesReturned:number;
  inventoryEntriesTruncated:boolean;
  executionStatus:'BLOCKED';
  executedFiles:0;
  executionReason:string;
}
export interface ScanReport { id:string; repository:string; owner:string; name:string; commit:string; branch:string; scannedAt:string; files:number; fileInventory:FileInventoryEntry[]; exclusions:{path:string;reason:string}[]; coverage:ScanCoverage; score:number; weightComplete:number; weightInScope:number; counts:Record<Severity,number>; findings:Finding[]; durability:'mongodb'|'volatile'; notes:string[]; }
export const WEIGHTS:Record<Severity,number>={Critical:10,High:6,Medium:3,Low:1};
export const RULES=[
 ['README documentation','Documentation','Medium',['README.md','README.rst','README.txt']],
 ['Open-source license','Governance','High',['LICENSE','LICENSE.md','LICENSE.txt']],
 ['Security policy','Security','High',['SECURITY.md','.github/SECURITY.md']],
 ['Contribution guide','Governance','Low',['CONTRIBUTING.md']],
 ['Code ownership','Governance','Medium',['.github/CODEOWNERS','CODEOWNERS']],
 ['Continuous integration workflow','CI/CD','High',['.github/workflows']],
 ['Automated tests','Quality','High',['tests','test','__tests__','spec']],
 ['Dependency lockfile','Dependencies','Medium',['pnpm-lock.yaml','package-lock.json','yarn.lock','Cargo.lock','poetry.lock','uv.lock','go.sum']],
 ['Dependency update automation','Dependencies','Medium',['.github/dependabot.yml','renovate.json','.renovaterc']],
 ['Static analysis workflow','Security','High',['.github/workflows/codeql.yml','.github/workflows/codeql.yaml']],
 ['Secret scanning configuration','Security','High',['.gitleaks.toml','.github/workflows/secret-scan.yml']],
 ['Container build definition','Operations','Medium',['Dockerfile','docker-compose.yml','compose.yaml']],
 ['Environment template','Configuration','Medium',['.env.example','.env.template']],
 ['Typed configuration','Quality','Low',['tsconfig.json','pyproject.toml','mypy.ini']],
 ['Lint configuration','Quality','Medium',['eslint.config.js','.eslintrc.json','ruff.toml','.prettierrc']],
 ['Formatting configuration','Quality','Low',['.editorconfig','.prettierrc','rustfmt.toml']],
 ['Release notes or changelog','Release','Low',['CHANGELOG.md','RELEASES.md']],
 ['Issue templates','Governance','Low',['.github/ISSUE_TEMPLATE']],
 ['Pull request template','Governance','Low',['.github/PULL_REQUEST_TEMPLATE.md']],
 ['Support guidance','Governance','Low',['SUPPORT.md']],
 ['Repository security automation','Security','High',['.github/workflows/security.yml','.github/workflows/semgrep.yml']],
 ['API or architecture documentation','Architecture','Medium',['docs/architecture.md','ARCHITECTURE.md','openapi.yaml','openapi.json']],
 ['Accessibility or quality checks','Quality','Medium',['.github/workflows/quality.yml','.github/workflows/ci.yml']],
 ['License and notice inventory','Governance','Medium',['NOTICE','NOTICE.md']],
 ['Branch protection status','Repository controls','High',[]],
] as const;
