import { ethers } from "ethers";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { orders, vaultLedger } from "../drizzle/schema";
import { logAuditEvent, createPaymentNotification } from "./db-extended";

/**
 * Blockchain Payment Detection Service
 * Monitors Ethereum/Polygon for incoming payments to vault addresses
 * Automatically confirms orders when payment is detected
 */

// Configuration - these should be environment variables
const NETWORK_RPC = process.env.BLOCKCHAIN_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/demo";
const NETWORK_NAME = process.env.BLOCKCHAIN_NETWORK || "ethereum";
const MIN_CONFIRMATIONS = parseInt(process.env.MIN_CONFIRMATIONS || "12");
const POLLING_INTERVAL = parseInt(process.env.POLLING_INTERVAL_MS || "30000"); // 30 seconds

interface PaymentDetectionResult {
  orderId: string;
  transactionHash: string;
  amount: string;
  confirmations: number;
  status: "confirmed" | "pending";
}

/**
 * Initialize blockchain provider
 */
export function initializeBlockchainProvider() {
  try {
    const provider = new ethers.JsonRpcProvider(NETWORK_RPC);
    console.log(`[Blockchain] Connected to ${NETWORK_NAME} via ${NETWORK_RPC}`);
    return provider;
  } catch (error) {
    console.error("[Blockchain] Failed to initialize provider:", error);
    return null;
  }
}

/**
 * Check if a payment has been received at a vault address
 */
export async function checkPaymentForVaultAddress(
  vaultAddress: string,
  expectedAmount: string,
  paymentMethod: "eth" | "usdc" | "btc"
): Promise<PaymentDetectionResult | null> {
  try {
    const provider = initializeBlockchainProvider();
    if (!provider) return null;

    // Get the latest block
    const latestBlock = await provider.getBlockNumber();

    // For Ethereum/Polygon - check native ETH transfers
    if (paymentMethod === "eth") {
      // Get all transactions to this address in the last 1000 blocks
      const logs = await provider.getLogs({
        address: vaultAddress,
        fromBlock: Math.max(0, latestBlock - 1000),
        toBlock: latestBlock,
      });

      // Check for incoming transactions
      for (let i = latestBlock; i > Math.max(0, latestBlock - 1000); i--) {
        const block = await provider.getBlock(i);
        if (!block) continue;

        for (const txHash of block.transactions || []) {
          const tx = await provider.getTransaction(txHash);
          if (!tx) continue;

          // Check if transaction is to our vault address
          if (tx.to?.toLowerCase() === vaultAddress.toLowerCase()) {
            const txReceipt = await provider.getTransactionReceipt(txHash);
            if (!txReceipt) continue;

            const confirmations = latestBlock - txReceipt.blockNumber;

            // Parse the amount (convert from wei)
            const receivedAmount = ethers.formatEther(tx.value);

            // Check if amount matches (with small tolerance for gas)
            if (parseFloat(receivedAmount) >= parseFloat(expectedAmount) * 0.99) {
              return {
                orderId: vaultAddress,
                transactionHash: txHash,
                amount: receivedAmount,
                confirmations,
                status: confirmations >= MIN_CONFIRMATIONS ? "confirmed" : "pending",
              };
            }
          }
        }
      }
    }

    // For USDC - check ERC20 token transfers
    if (paymentMethod === "usdc") {
      const usdcContractAddress = process.env.USDC_CONTRACT_ADDRESS || "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

      // ERC20 Transfer event signature: Transfer(address indexed from, address indexed to, uint256 value)
      const transferEventSignature = ethers.id("Transfer(address,address,uint256)");

      const logs = await provider.getLogs({
        address: usdcContractAddress,
        topics: [transferEventSignature, null, ethers.zeroPadValue(vaultAddress, 32)],
        fromBlock: Math.max(0, latestBlock - 1000),
        toBlock: latestBlock,
      });

      if (logs.length > 0) {
        const log = logs[logs.length - 1]; // Get the most recent transfer
        const txReceipt = await provider.getTransactionReceipt(log.transactionHash);
        if (!txReceipt) return null;

        const confirmations = latestBlock - txReceipt.blockNumber;

        // Decode the transfer amount (USDC has 6 decimals)
        const amount = ethers.toBeHex(log.data);
        const amountInUsdc = (BigInt(amount) / BigInt(10 ** 6)).toString();

        if (parseFloat(amountInUsdc) >= parseFloat(expectedAmount) * 0.99) {
          return {
            orderId: vaultAddress,
            transactionHash: log.transactionHash,
            amount: amountInUsdc,
            confirmations,
            status: confirmations >= MIN_CONFIRMATIONS ? "confirmed" : "pending",
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error("[Blockchain] Error checking payment:", error);
    return null;
  }
}

/**
 * Process all pending orders and check for payments
 */
export async function processPendingPayments() {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Blockchain] Database not available");
      return;
    }

    // Get all pending orders
    const pendingOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.status, "pending"));

    console.log(`[Blockchain] Checking ${pendingOrders.length} pending orders for payments...`);

    for (const order of pendingOrders) {
      try {
        // Get vault entry for this order
        const vaultEntries = await db
          .select()
          .from(vaultLedger)
          .where(eq(vaultLedger.orderId, order.id));

        if (vaultEntries.length === 0) continue;

        const vaultEntry = vaultEntries[0];
        const vaultAddress = `solvex-vault-${order.id}`;

        // Check for payment
        const payment = await checkPaymentForVaultAddress(
          vaultAddress,
          order.amount.toString(),
          order.paymentMethod as "eth" | "usdc" | "btc"
        );

        if (payment && payment.status === "confirmed") {
          console.log(`[Blockchain] Payment confirmed for order ${order.id}: ${payment.transactionHash}`);

          // Update order status
          await db
            .update(orders)
            .set({
              status: "confirmed",
              confirmedAt: new Date(),
            })
            .where(eq(orders.id, order.id));

          // Update vault entry
          await db
            .update(vaultLedger)
            .set({
              status: "held",
            })
            .where(eq(vaultLedger.id, vaultEntry.id));

          // Log audit event
          await logAuditEvent(
            "payment_confirmed_blockchain",
            "success",
            {
              orderId: order.id,
              transactionHash: payment.transactionHash,
              amount: payment.amount,
              confirmations: payment.confirmations,
            },
            order.userId,
            order.id,
            undefined,
            vaultEntry.id
          );

          // Create notification
          await createPaymentNotification(
            order.id,
            "payment_confirmed",
            `Payment of ${payment.amount} ${order.paymentMethod.toUpperCase()} confirmed on blockchain`,
            vaultEntry.id,
            {
              transactionHash: payment.transactionHash,
              confirmations: payment.confirmations,
            }
          );
        } else if (payment && payment.status === "pending") {
          console.log(
            `[Blockchain] Payment detected but pending confirmations for order ${order.id}: ${payment.transactionHash} (${payment.confirmations}/${MIN_CONFIRMATIONS})`
          );

          // Create notification for pending payment
          await createPaymentNotification(
            order.id,
            "payment_received",
            `Payment received but awaiting ${MIN_CONFIRMATIONS - payment.confirmations} more confirmations`,
            vaultEntry.id,
            {
              transactionHash: payment.transactionHash,
              confirmations: payment.confirmations,
              requiredConfirmations: MIN_CONFIRMATIONS,
            }
          );
        }
      } catch (error) {
        console.error(`[Blockchain] Error processing order ${order.id}:`, error);
      }
    }
  } catch (error) {
    console.error("[Blockchain] Error in processPendingPayments:", error);
  }
}

/**
 * Start the blockchain payment detection service
 * Runs in the background and checks for payments at regular intervals
 */
export function startBlockchainPaymentDetection() {
  console.log(`[Blockchain] Starting payment detection service (polling every ${POLLING_INTERVAL}ms)`);

  // Run immediately
  processPendingPayments().catch(console.error);

  // Then run at regular intervals
  setInterval(() => {
    processPendingPayments().catch(console.error);
  }, POLLING_INTERVAL);
}

/**
 * Get transaction details from blockchain
 */
export async function getTransactionDetails(transactionHash: string) {
  try {
    const provider = initializeBlockchainProvider();
    if (!provider) return null;

    const tx = await provider.getTransaction(transactionHash);
    const receipt = await provider.getTransactionReceipt(transactionHash);

    if (!tx || !receipt) return null;

    const latestBlock = await provider.getBlockNumber();
    const confirmations = latestBlock - receipt.blockNumber;

    return {
      hash: transactionHash,
      from: tx.from,
      to: tx.to,
      value: ethers.formatEther(tx.value),
      gasPrice: ethers.formatUnits(tx.gasPrice || 0, "gwei"),
      gasUsed: receipt.gasUsed?.toString(),
      blockNumber: receipt.blockNumber,
      confirmations,
      status: receipt.status === 1 ? "success" : "failed",
      timestamp: (await provider.getBlock(receipt.blockNumber))?.timestamp,
    };
  } catch (error) {
    console.error("[Blockchain] Error getting transaction details:", error);
    return null;
  }
}

/**
 * Validate a vault address format
 */
export function isValidVaultAddress(address: string): boolean {
  return address.startsWith("solvex-vault-");
}

/**
 * Generate a unique vault address for an order
 */
export function generateVaultAddress(orderId: string): string {
  return `solvex-vault-${orderId}`;
}
