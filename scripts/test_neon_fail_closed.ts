import { strict as assert } from 'node:assert';
import { NeonStore } from '../src/database/NeonPersistence.js';

// Regression: a live SQL connection alone must never permit tenant I/O.
// Use a query spy so this test cannot touch any real database.
const store = NeonStore.getInstance() as any;
let queryCount = 0;
store.isConnected = true;
store.neonClient = {
  query: async () => {
    queryCount += 1;
    throw new Error('Unexpected SQL query in fail-closed regression test');
  }
};
store.tenantIsolationVerified = false;

const write = await store.insertRecord('orders', {
  id: 'regression-only',
  tenant_id: 'tenant-a'
});
assert.equal(write, false, 'tenant write must fail when RLS posture is unverified');

const read = await store.findTenantRecords('orders', 'tenant-a');
assert.deepEqual(read, [], 'tenant read must fail closed when RLS posture is unverified');
assert.equal(queryCount, 0, 'no SQL may run while tenant isolation is unverified');

console.log('PASS: Neon tenant reads and writes fail closed until RLS posture verifies.');
