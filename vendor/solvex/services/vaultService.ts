import { computeSha256 } from '../database/DatabaseSchema';

export interface AGATELedgerTransaction {
  id: string;
  timestamp: number;
  type: 'MINT_WASTE_RECOVERY' | 'ESCROW_SETTLEMENT' | 'HARVEST_REWARD' | 'GENESIS';
  amount_agate: number;
  waste_kg_certified: number;
  harvester_address: string;
  merkle_leaf_hash: string;
}

export interface AGATESovereignLedger {
  network: string;
  merkle_root: string;
  Sovereign_Wallet_System: {
    total_supply: number;
    burned_waste_kg_total: number;
    active_harvesters_count: number;
    mint_rate_per_kg: number;
    treasury_balance: number;
  };
  transactions: AGATELedgerTransaction[];
}

export class VaultService {
  private static instance: VaultService | null = null;
  private ledger: AGATESovereignLedger;

  private constructor() {
    this.ledger = {
      network: 'Project-AGATE-Mainnet-Cluster-Sovereign-v1',
      merkle_root: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      Sovereign_Wallet_System: {
        total_supply: 1542000.5,
        burned_waste_kg_total: 10280003.3,
        active_harvesters_count: 1482,
        mint_rate_per_kg: 0.15,
        treasury_balance: 850000.0
      },
      transactions: [
        {
          id: 'TX-GENESIS-AGATE-00',
          timestamp: 1774400000000,
          type: 'GENESIS',
          amount_agate: 1000000.0,
          waste_kg_certified: 6666666.6,
          harvester_address: 'SOV_GENESIS_ROOT_MASTER_KEY',
          merkle_leaf_hash: computeSha256('GENESIS_BLOCK_AGATE')
        },
        {
          id: 'TX-HARVEST-2026-09-01',
          timestamp: Date.now() - 3600000 * 24 * 2,
          type: 'MINT_WASTE_RECOVERY',
          amount_agate: 1500.0,
          waste_kg_certified: 10000.0,
          harvester_address: '0x99A8c...B2E1',
          merkle_leaf_hash: computeSha256('TX-HARVEST-2026-09-01')
        }
      ]
    };
  }

  public static getInstance(): VaultService {
    if (!VaultService.instance) {
      VaultService.instance = new VaultService();
    }
    return VaultService.instance;
  }

  public getLedger(): AGATESovereignLedger {
    return this.ledger;
  }

  public recordWasteBurn(wasteKg: number, harvesterAddress: string): AGATELedgerTransaction {
    const mintAmount = Number((wasteKg * this.ledger.Sovereign_Wallet_System.mint_rate_per_kg).toFixed(4));
    const txId = `TX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const leafHash = computeSha256(`${txId}:${wasteKg}:${mintAmount}:${harvesterAddress}`);

    const tx: AGATELedgerTransaction = {
      id: txId,
      timestamp: Date.now(),
      type: 'MINT_WASTE_RECOVERY',
      amount_agate: mintAmount,
      waste_kg_certified: wasteKg,
      harvester_address: harvesterAddress,
      merkle_leaf_hash: leafHash
    };

    this.ledger.transactions.unshift(tx);
    this.ledger.Sovereign_Wallet_System.total_supply += mintAmount;
    this.ledger.Sovereign_Wallet_System.burned_waste_kg_total += wasteKg;
    this.ledger.merkle_root = computeSha256(`${this.ledger.merkle_root}:${leafHash}`);

    return tx;
  }
}

export const vaultService = VaultService.getInstance();
