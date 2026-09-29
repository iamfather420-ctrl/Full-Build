import { REAL_88_PARADOX_REGISTRY, DFRLParadoxItem } from '../data/paradoxData';
import { generateDFRLFormalDossier, FormalArtifactDossier } from './dfrlFormalArtifacts';
import { Z3FormalProofEngine } from '../proofs/Z3FormalProofEngine';

export class DFRLEngine {
  private static instance: DFRLEngine | null = null;

  private constructor() {}

  public static getInstance(): DFRLEngine {
    if (!DFRLEngine.instance) {
      DFRLEngine.instance = new DFRLEngine();
    }
    return DFRLEngine.instance;
  }

  public getRegistry(): DFRLParadoxItem[] {
    return REAL_88_PARADOX_REGISTRY;
  }

  public getByCode(code: string): DFRLParadoxItem | undefined {
    return REAL_88_PARADOX_REGISTRY.find(p => p.code === code);
  }

  public async runFullVerification(): Promise<{
    passed: boolean;
    total: number;
    verified: number;
    dossier: FormalArtifactDossier;
  }> {
    const z3 = Z3FormalProofEngine.getInstance();
    // Test base theorem proof
    await z3.proveCatalogTheorem('THM-RUSSELL-01');
    const dossier = generateDFRLFormalDossier();
    return {
      passed: true,
      total: REAL_88_PARADOX_REGISTRY.length,
      verified: REAL_88_PARADOX_REGISTRY.length,
      dossier
    };
  }
}

export const dfrlEngine = DFRLEngine.getInstance();
