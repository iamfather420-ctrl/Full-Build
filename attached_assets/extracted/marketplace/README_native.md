

## 🔒 SolveX Production Deployment Guide

### System Architecture

**SolveX** is a fully autonomous, owner-only crypto-native marketplace for selling paradox solutions with:

- **Autonomous Payment Vault**: All crypto payments held on-site with configurable hold periods (minimum 72 hours)
- **Solution Protection**: Cryptographic access tokens prevent copying, resale, and unauthorized access
- **Owner-Only Control**: Comprehensive dashboard accessible only to the system owner (admin role)
- **Complete Audit Trail**: Every system event logged with timestamps, user IDs, and detailed metadata
- **Automatic Delivery**: Solutions unlock automatically when vault holds expire
- **Subscription Management**: Track user access levels and control permissions

### Database Schema

The system uses 12 tables:

1. **users** - Core authentication
2. **paradox_products** - Pre-packaged solutions for sale
3. **orders** - Purchase records with payment tracking
4. **vault_ledger** - Payment vault with hold period tracking
5. **user_purchases** - User library of purchased solutions
6. **vault_config** - Configurable hold periods (minimum 72 hours)
7. **solution_access_tokens** - Cryptographic tokens for solution access
8. **audit_log** - Complete event audit trail
9. **owner_settings** - Owner configuration and withdrawal tracking
10. **subscriptions** - User subscription management
11. **payment_notifications** - Autonomous payment event notifications
12. **system_stats** - Aggregated system statistics

### Owner Dashboard Features

Access at `/owner` (admin-only):

#### Overview Tab
- Real-time system status
- Vault balance and available funds
- Total orders and revenue
- Recent activity log

#### Vault & Withdrawals Tab
- View all vault entries by status (pending/held/available/withdrawn)
- Select multiple entries for batch withdrawal
- Input withdrawal address (crypto wallet)
- Automatic calculation of total withdrawal amount
- Complete vault ledger with timestamps

#### Notifications Tab
- Real-time payment notifications
- Event types: payment_received, payment_confirmed, hold_expiring, hold_expired, solution_delivered, payment_failed, access_attempted, access_denied
- Mark notifications as read
- Filter by read/unread status

#### Audit Log Tab
- Complete event history with pagination
- Filter by event type
- View user IDs, timestamps, and status
- Track all system operations

#### Settings Tab
- View withdrawal address
- Total withdrawn amount
- System status (active/maintenance/paused)
- Auto-payment detection toggle
- Auto-delivery toggle

### Solution Protection Mechanisms

1. **Cryptographic Access Tokens**
   - Each purchased solution gets a unique 64-byte hex token
   - Tokens are stored in `solution_access_tokens` table
   - Tokens can have optional expiration dates
   - Access count is tracked for each token

2. **Anti-Copy Protection**
   - Solutions are only accessible via valid tokens
   - Token validation checks:
     - Token exists and is active
     - Token has not expired
     - User owns the token
   - Unauthorized access attempts are logged

3. **Anti-Resale Protection**
   - Tokens are tied to specific user IDs
   - Cannot be transferred or shared
   - Each purchase creates a new unique token
   - Duplicate purchases are prevented

4. **Access Logging**
   - Every solution access attempt is logged
   - Failed access attempts are recorded
   - Access count incremented on each valid access
   - Last accessed timestamp tracked

### Payment Vault System

#### Vault Hold Period
- Default: 72 hours (3 days)
- Minimum: 72 hours (enforced)
- Configurable by owner
- Prevents immediate withdrawal of funds

#### Vault Entry States
1. **pending** - Payment received, awaiting confirmation
2. **held** - Payment confirmed, in hold period
3. **available** - Hold period expired, ready for withdrawal
4. **withdrawn** - Owner has withdrawn funds

#### Automatic Processing
- `vault.processHolds` mutation processes expired holds
- Automatically marks entries as available
- Automatically delivers solutions to users
- Creates and unlocks user purchases
- Can be called by owner on-demand

#### Withdrawal Process
1. Owner selects available vault entries
2. Owner provides withdrawal address
3. System validates all entries are available
4. Entries marked as withdrawn
5. Owner total withdrawn amount updated
6. Withdrawal logged in audit trail
7. Notification created

### Autonomous Payment Detection

The system supports autonomous payment detection through:

1. **Manual Confirmation** (current)
   - Owner calls `orders.confirmPayment` mutation
   - Provides transaction hash for verification
   - Vault entry marked as held

2. **Automatic Detection** (production)
   - Integrate Web3.js or ethers.js
   - Monitor blockchain for payments to vault addresses
   - Auto-confirm when payment detected
   - Auto-trigger vault processing

### API Endpoints

#### Marketplace
- `marketplace.getProducts` - Get all paradoxes
- `marketplace.getProduct` - Get single paradox
- `marketplace.seedProducts` - Initialize products (admin only)

#### Orders
- `orders.createOrder` - Create new order
- `orders.getMyOrders` - Get user's orders
- `orders.getOrder` - Get order by ID
- `orders.confirmPayment` - Confirm payment (admin only)
- `orders.getAllOrders` - Get all orders (admin only)

#### Vault
- `vault.getConfig` - Get hold period config
- `vault.updateConfig` - Update hold period (admin only)
- `vault.getAllEntries` - Get all vault entries (admin only)
- `vault.getAvailableFunds` - Get available funds (admin only)
- `vault.withdraw` - Withdraw funds (admin only)
- `vault.processHolds` - Process expired holds (admin only)

#### User Library
- `library.getMyLibrary` - Get user's purchases
- `library.hasPurchased` - Check if user owns paradox

#### Owner Dashboard
- `owner.getSettings` - Get owner settings (admin only)
- `owner.getNotifications` - Get all notifications (admin only)
- `owner.getAuditLog` - Get audit log (admin only)
- `owner.getSystemStats` - Get system statistics (admin only)
- `owner.getStatsHistory` - Get stats history (admin only)
- `owner.initiateWithdrawal` - Initiate withdrawal (admin only)

### Security Best Practices

1. **Role-Based Access Control**
   - All owner endpoints check `ctx.user.role === "admin"`
   - Throws FORBIDDEN error for unauthorized access
   - Cannot be bypassed from frontend

2. **Data Validation**
   - All inputs validated with Zod schemas
   - Withdrawal address required
   - Minimum hold period enforced (72 hours)
   - Entry status validated before withdrawal

3. **Audit Logging**
   - Every sensitive operation logged
   - IP address and user agent captured
   - Event status tracked (success/failed/pending)
   - Detailed metadata stored as JSON

4. **Token Security**
   - Tokens generated with 32 bytes of randomness
   - Stored as unique hex strings
   - Cannot be guessed or brute-forced
   - Expiration enforced

5. **Payment Verification**
   - Transaction hashes stored for verification
   - Hold periods prevent immediate withdrawal
   - Multiple confirmations required

### Deployment Checklist

- [ ] Database schema created and migrated
- [ ] Owner account created with admin role
- [ ] Paradox products seeded via `marketplace.seedProducts`
- [ ] Owner withdrawal address configured
- [ ] Vault hold period configured (minimum 72 hours)
- [ ] Payment detection system integrated (Web3/ethers)
- [ ] Email notifications configured (optional)
- [ ] Backup and disaster recovery plan
- [ ] SSL/TLS certificates installed
- [ ] Rate limiting configured
- [ ] DDoS protection enabled
- [ ] Monitoring and alerting set up
- [ ] Audit logs backed up regularly

### Monitoring & Maintenance

1. **Daily Tasks**
   - Check vault balance
   - Review new orders
   - Monitor failed payments
   - Check for access attempts

2. **Weekly Tasks**
   - Review audit log
   - Process vault holds
   - Withdraw available funds
   - Check system statistics

3. **Monthly Tasks**
   - Review subscription status
   - Audit access tokens
   - Verify payment records
   - Update system configuration

### Troubleshooting

**Orders stuck in pending state**
- Check if payment was actually received
- Manually confirm with `orders.confirmPayment`
- Review audit log for errors

**Vault entries not becoming available**
- Call `vault.processHolds` mutation
- Check hold period configuration
- Verify current time vs holdUntil timestamp

**Solutions not delivering**
- Ensure auto-delivery is enabled in settings
- Call `vault.processHolds` to trigger delivery
- Check user purchase records

**Access token validation failing**
- Verify token is active and not expired
- Check user ID matches token owner
- Review access attempt in audit log

### Support & Documentation

For more information, see:
- Database schema: `drizzle/schema.ts`
- Backend procedures: `server/routers.ts`
- Extended functions: `server/db-extended.ts`
- Owner dashboard: `client/src/pages/OwnerDashboard.tsx`
- API types: `shared/types.ts`
