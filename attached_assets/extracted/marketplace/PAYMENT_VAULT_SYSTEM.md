# SolveX Payment Processing & Vault Management System

## System Overview

The SolveX marketplace implements a **cryptographically-secured payment vault system** that holds all incoming cryptocurrency payments for a configurable period (default 72 hours) before releasing them for owner withdrawal. This system ensures buyer satisfaction, prevents fraud, and provides complete transparency.

---

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    PAYMENT FLOW                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Customer Purchase → 2. Payment Detection → 3. Vault Hold │
│                                                               │
│  4. Automatic Unlock → 5. Solution Delivery → 6. Withdrawal  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

**Orders Table** — Tracks all purchase transactions
```sql
- id: Unique order identifier
- userId: Customer ID
- paradoxId: Product being purchased
- status: pending | confirmed | delivered | failed
- paymentMethod: eth | usdc | btc
- amount: Payment amount in crypto
- walletAddress: Vault address for payment
- transactionHash: Blockchain transaction ID
- createdAt: Order timestamp
- confirmedAt: Payment confirmation timestamp
- deliveredAt: Solution delivery timestamp
```

**Vault Ledger Table** — Tracks payment holds and availability
```sql
- id: Unique vault entry ID
- orderId: Associated order
- userId: Customer ID
- amount: Held amount
- paymentMethod: Cryptocurrency type
- status: pending | held | available | withdrawn
- holdUntil: Timestamp when hold expires
- withdrawnAt: Withdrawal timestamp
- createdAt: Entry creation time
- updatedAt: Last status update
```

**User Purchases Table** — Tracks unlocked solutions
```sql
- id: Purchase record ID
- userId: Customer ID
- paradoxId: Solution purchased
- orderId: Associated order
- unlockedAt: When solution became accessible
- purchasedAt: Purchase timestamp
```

---

## Payment Processing Flow

### Step 1: Order Creation

**When a customer initiates a purchase:**

```typescript
// Backend procedure: orders.createOrder
Input:
  - paradoxId: Solution being purchased
  - paymentMethod: eth | usdc | btc
  - userId: Authenticated customer

Process:
  1. Validate paradox exists
  2. Check customer hasn't purchased this paradox before
  3. Generate unique vault address (format: solvex-vault-{orderId})
  4. Calculate amount in selected cryptocurrency
  5. Create order record with status: "pending"
  6. Create vault ledger entry with status: "pending"

Output:
  - orderId: Unique order identifier
  - walletAddress: Vault address to send payment to
  - amount: Exact payment amount required
  - paymentMethod: Cryptocurrency type
  - expiresAt: Payment window expiration (typically 24 hours)
```

**Example Response:**
```json
{
  "orderId": "ord_abc123xyz",
  "walletAddress": "solvex-vault-ord_abc123xyz",
  "amount": "0.5",
  "paymentMethod": "eth",
  "priceUsd": "$1500",
  "expiresAt": "2026-06-18T12:00:00Z"
}
```

---

### Step 2: Blockchain Payment Detection

**Autonomous payment monitoring via Alchemy API:**

```typescript
// Backend service: blockchain.ts
Process:
  1. Poll Alchemy API every 30 seconds for incoming transactions
  2. Monitor vault addresses for all pending orders
  3. Verify transaction details:
     - Sender: Customer wallet
     - Recipient: Vault address
     - Amount: Matches order amount (within tolerance)
     - Network: Correct blockchain (Ethereum, Polygon, etc.)
     - Confirmations: Meets minimum threshold (default 12)

  4. On successful detection:
     - Update order status: "confirmed"
     - Record transactionHash
     - Set confirmedAt timestamp
     - Update vault ledger status: "held"
     - Calculate holdUntil: now + 72 hours
```

**Supported Networks:**
- Ethereum Mainnet (ETH)
- Polygon (USDC)
- Arbitrum (USDC)
- Optimism (USDC)
- Bitcoin (BTC) — via bridge services

**Confirmation Requirements:**
- ETH: 12 confirmations (~3 minutes)
- USDC: 12 confirmations (~3 minutes)
- BTC: 6 confirmations (~30 minutes)

---

### Step 3: Vault Hold Period

**72-Hour Protection Window**

```
Timeline:
├─ Payment Confirmed (T+0)
│  └─ Status: "held"
│  └─ holdUntil: T+72 hours
│
├─ T+24 hours
│  └─ Customer can request refund
│  └─ Vault returns payment to customer wallet
│
├─ T+48 hours
│  └─ Refund window closes
│  └─ Status locked to "available"
│
└─ T+72 hours
   └─ Automatic unlock
   └─ Status: "available"
   └─ Solution delivered to customer
   └─ Owner can withdraw funds
```

**During Hold Period:**

- **Customer Protection**: Full refund available within 24 hours if unsatisfied
- **Fraud Prevention**: Detects chargebacks and suspicious patterns
- **Owner Assurance**: Funds are guaranteed after 72 hours
- **Transparency**: Real-time countdown visible in dashboard

---

### Step 4: Automatic Unlock & Delivery

**When hold period expires:**

```typescript
// Backend procedure: orders.processHolds
Trigger: Every 5 minutes (cron job)

Process:
  1. Query vault ledger for entries where holdUntil <= now
  2. For each expired hold:
     a. Update vault status: "available"
     b. Update order status: "delivered"
     c. Create user purchase record
     d. Set unlockedAt timestamp
     e. Trigger solution delivery

  3. Solution Delivery:
     - Generate access token (unique per user/paradox)
     - Store token in user_purchases table
     - Make solution visible in user library
     - Send notification to customer
     - Log event in audit trail

Output:
  - Solution now accessible in customer's library
  - Owner can see funds as "available" in dashboard
  - Audit log records automatic unlock
```

**Solution Access Token:**
```typescript
{
  token: "solvex_access_xyz123...",
  userId: 12345,
  paradoxId: "para_001",
  issuedAt: "2026-06-20T12:00:00Z",
  expiresAt: "2027-06-20T12:00:00Z",
  permissions: ["read"],
  restrictions: {
    canCopy: false,
    canShare: false,
    canExport: false,
    maxDevices: 1
  }
}
```

---

### Step 5: Owner Withdrawal

**Manual withdrawal process:**

```typescript
// Backend procedure: vault.initiateWiththdrawal
Input:
  - amount: Amount to withdraw
  - withdrawalAddress: Owner's crypto wallet
  - paymentMethod: eth | usdc | btc

Validation:
  1. Verify user is owner (role === "admin")
  2. Check available balance >= amount
  3. Validate withdrawal address format
  4. Check withdrawal history for anomalies

Process:
  1. Create withdrawal record
  2. Update vault ledger entries:
     - Select "available" entries totaling amount
     - Change status: "withdrawn"
     - Set withdrawnAt timestamp
  3. Initiate on-chain transfer:
     - Build transaction
     - Sign with vault key
     - Broadcast to blockchain
  4. Monitor transaction confirmation
  5. Update records on confirmation

Output:
  - withdrawalId: Unique withdrawal identifier
  - transactionHash: Blockchain transaction ID
  - status: "pending" → "confirmed"
  - estimatedTime: Time to confirmation
```

**Withdrawal Limits & Safeguards:**
- Minimum withdrawal: $100 USD equivalent
- Maximum per transaction: $50,000 USD equivalent
- Daily limit: $100,000 USD equivalent
- Cooldown between withdrawals: 1 hour
- 2-factor authentication required
- Email confirmation required

---

## Vault Status States

### Order Status Lifecycle

```
┌─────────┐
│ pending │  ← Order created, awaiting payment
└────┬────┘
     │ (Payment detected on blockchain)
     ↓
┌───────────┐
│ confirmed │  ← Payment verified, entering 72-hour hold
└────┬──────┘
     │ (72 hours elapsed)
     ↓
┌───────────┐
│ delivered │  ← Solution unlocked, available for withdrawal
└────┬──────┘
     │ (Owner withdraws funds)
     ↓
┌────────┐
│ failed │  ← Payment failed or refund issued
└────────┘
```

### Vault Ledger Status Lifecycle

```
pending  → held  → available  → withdrawn
  ↓        ↓          ↓            ↓
Awaiting  In Hold   Ready for    Funds
Payment   Period    Withdrawal   Transferred
```

---

## Real-Time Monitoring

### Owner Dashboard Displays

**Vault Balance Summary:**
```
Total Balance:        $45,230.50
├─ Pending:           $1,200.00  (awaiting confirmation)
├─ Held (72h):        $15,000.00 (unlocks in 2d 14h)
├─ Available:         $29,030.50 (ready to withdraw)
└─ Withdrawn (30d):   $125,000.00 (historical)
```

**Payment Records Table:**
```
Order ID      | Customer    | Amount  | Status    | Hold Until        | Action
──────────────┼─────────────┼─────────┼───────────┼───────────────────┼────────
ord_abc123    | user@ex.com | 0.5 ETH | held      | 2026-06-20 12:00  | View
ord_def456    | user@ex.com | 1500    | available | 2026-06-19 08:30  | Withdraw
ord_ghi789    | user@ex.com | 0.01    | pending   | 2026-06-18 14:00  | Confirm
```

**Withdrawal History:**
```
Date              | Amount      | Method | Status    | Tx Hash
──────────────────┼─────────────┼────────┼───────────┼────────────────
2026-06-17 10:30  | $10,000.00  | ETH    | confirmed | 0x7f8c...
2026-06-16 15:45  | $5,000.00   | USDC   | confirmed | 0x3a2b...
2026-06-15 09:20  | $8,500.00   | BTC    | confirmed | 1a2b3c...
```

---

## Security Features

### Payment Verification

**Multi-layer validation:**

1. **Blockchain Verification**
   - Confirm transaction on public ledger
   - Verify sender address
   - Check transaction value
   - Validate network and contract

2. **Amount Tolerance**
   - Accept payments within ±0.1% of expected amount
   - Prevent dust attacks
   - Flag suspicious patterns

3. **Rate Limiting**
   - Max 5 orders per user per hour
   - Max 10 orders per IP per hour
   - Cooldown between rapid orders

4. **Fraud Detection**
   - Detect velocity anomalies
   - Flag high-value orders
   - Monitor for refund loops
   - Track suspicious wallets

### Solution Protection

**Anti-copying mechanisms:**

```typescript
// Access Token Restrictions
{
  canCopy: false,        // Prevent text selection
  canShare: false,       // No sharing links
  canExport: false,      // No PDF/download
  canScreenshot: false,  // Block screenshots
  maxDevices: 1,         // Single device access
  ipRestriction: true,   // Lock to original IP
  expiresAt: "2027-06-20" // 1-year expiration
}

// Implementation
- Solutions rendered in iframe with restricted permissions
- Watermark with user ID on all views
- Session tracking prevents concurrent access
- Device fingerprinting prevents sharing
```

### Vault Security

**Private key management:**

```
Vault Private Keys:
├─ Stored in encrypted HSM (Hardware Security Module)
├─ Multi-signature required for withdrawals (2-of-3)
├─ Audit log for all key access
├─ Rotation every 90 days
└─ Backup in secure vault
```

**Access Control:**

```
Owner Dashboard:
├─ OAuth 2.0 authentication
├─ 2FA required for withdrawals
├─ IP whitelist support
├─ Session timeout: 30 minutes
└─ All actions logged
```

---

## Audit Trail

**Complete transaction history:**

```typescript
// Audit Log Entry
{
  id: "audit_001",
  timestamp: "2026-06-17T12:00:00Z",
  userId: 12345,
  action: "payment_confirmed",
  orderId: "ord_abc123",
  details: {
    amount: "0.5",
    currency: "eth",
    txHash: "0x7f8c...",
    confirmations: 12
  },
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  status: "success"
}
```

**Queryable by:**
- Date range
- User ID
- Order ID
- Action type
- Status
- IP address

---

## Configuration

### Adjustable Parameters

**In Owner Dashboard Settings:**

```typescript
// Vault Configuration
{
  holdPeriodHours: 72,           // Default hold duration
  minConfirmations: {
    eth: 12,
    usdc: 12,
    btc: 6
  },
  refundWindow: 24,              // Hours for refund eligibility
  paymentTimeout: 24,            // Hours to complete payment
  maxOrdersPerUser: 100,         // Monthly limit
  maxOrdersPerIp: 500,           // Monthly limit
  
  // Withdrawal Settings
  minWithdrawal: 100,            // USD equivalent
  maxWithdrawal: 50000,          // Per transaction
  dailyLimit: 100000,            // Total daily
  withdrawalCooldown: 3600,      // Seconds between withdrawals
  
  // Security
  require2FA: true,
  enableIpWhitelist: false,
  enableDeviceFingerprint: true,
  enableRateLimiting: true
}
```

---

## Error Handling

### Payment Failures

**Scenarios and recovery:**

| Scenario | Detection | Recovery |
|----------|-----------|----------|
| Insufficient funds | Payment fails on blockchain | Order stays pending, customer retries |
| Wrong address | Payment sent to wrong address | Manual refund via support |
| Network congestion | Transaction takes >24 hours | Automatic refund after timeout |
| Double payment | Same customer pays twice | Duplicate detected, refund issued |
| Blockchain reorg | Transaction reverses | Order reverted to pending |

### Refund Process

```typescript
// Automatic Refund (within 24 hours)
1. Customer requests refund
2. Verify refund window is open
3. Validate order status
4. Create refund transaction
5. Return funds to customer wallet
6. Update order status: "failed"
7. Update vault status: "withdrawn"
8. Send confirmation email

// Manual Refund (after 24 hours)
1. Owner initiates manual refund
2. Verify authorization
3. Create manual refund record
4. Initiate blockchain transaction
5. Log in audit trail
6. Notify customer
```

---

## Performance Metrics

### System Monitoring

**Key Performance Indicators:**

```
Payment Detection Latency:
├─ Average: 2-3 minutes
├─ P95: 5 minutes
└─ P99: 10 minutes

Vault Processing:
├─ Order creation: <100ms
├─ Payment confirmation: <500ms
├─ Automatic unlock: <1s
└─ Withdrawal initiation: <2s

Availability:
├─ Target: 99.9% uptime
├─ Payment processing: 99.95%
├─ Vault operations: 99.99%
└─ Blockchain monitoring: 99.9%
```

---

## Compliance & Legal

### Regulatory Considerations

**AML/KYC (Anti-Money Laundering / Know Your Customer):**
- Monitor for suspicious patterns
- Flag high-value transactions
- Maintain transaction records for 7 years
- Report suspicious activity to authorities

**Tax Reporting:**
- Track all transactions for tax purposes
- Generate 1099-K equivalents for US users
- Support for other jurisdictions
- Export reports for accounting

**Terms of Service:**
- 72-hour satisfaction guarantee
- No refunds after hold period
- Non-transferable access tokens
- Violation of terms results in account suspension

---

## Future Enhancements

**Planned features:**

1. **Multi-signature Wallets** — 2-of-3 or 3-of-5 signing for extra security
2. **Staking Integration** — Earn yield on held funds during 72-hour period
3. **Instant Withdrawals** — Premium feature for immediate fund access
4. **Payment Splitting** — Distribute payments to multiple wallets
5. **Recurring Payments** — Subscription-based paradox access
6. **Cross-chain Bridging** — Accept payments on any blockchain
7. **DeFi Integration** — Use Aave/Compound for yield generation
8. **DAO Governance** — Community voting on system parameters

---

## Support & Troubleshooting

**Common Issues:**

| Issue | Cause | Solution |
|-------|-------|----------|
| Payment not detected | Network congestion | Wait 10-15 minutes, check blockchain explorer |
| Wrong amount sent | User error | Contact support for manual verification |
| Withdrawal failed | Invalid address | Verify address format, try again |
| Access token expired | Time-based expiration | Repurchase solution or contact support |
| Solution not unlocking | System delay | Wait 5 minutes, refresh page |

**Contact Support:**
- Email: support@solvex.io
- Discord: https://discord.gg/solvex
- Telegram: https://t.me/solvex_official
