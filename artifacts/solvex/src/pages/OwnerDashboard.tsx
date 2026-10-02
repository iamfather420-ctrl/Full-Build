import { DashboardLayout } from "@/components/DashboardLayout";
import { useGetVaultConfig, useGetVaultEntries, useGetAvailableFunds, useGetSystemStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OwnerDashboard() {
  const { data: stats } = useGetSystemStats();
  const { data: funds } = useGetAvailableFunds();
  const { data: entries } = useGetVaultEntries();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-mono font-bold mb-2 text-primary uppercase">Command Center</h1>
          <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest">System overview and vault management.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="py-4"><CardTitle className="text-xs text-muted-foreground uppercase font-mono tracking-widest">Vault Balance</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-mono text-green-500">{stats?.vaultBalance || '0.00'} ETH</div></CardContent>
          </Card>
          <Card className="bg-card border-border">
             <CardHeader className="py-4"><CardTitle className="text-xs text-muted-foreground uppercase font-mono tracking-widest">Available to Withdraw</CardTitle></CardHeader>
             <CardContent><div className="text-2xl font-mono text-primary">{funds?.total || '0'}</div></CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="py-4"><CardTitle className="text-xs text-muted-foreground uppercase font-mono tracking-widest">Total Revenue</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-mono text-accent">{stats?.totalRevenue || '$0'}</div></CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="py-4"><CardTitle className="text-xs text-muted-foreground uppercase font-mono tracking-widest">Solved Problems</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-mono">{stats?.solvedProblems || 0}</div></CardContent>
          </Card>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-mono text-primary uppercase border-b border-border pb-2">Vault Ledger</h2>
          <div className="bg-card border border-border rounded overflow-hidden">
            <table className="w-full text-sm font-mono text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-3 font-normal uppercase tracking-widest text-[10px]">ID</th>
                  <th className="p-3 font-normal uppercase tracking-widest text-[10px]">Amount</th>
                  <th className="p-3 font-normal uppercase tracking-widest text-[10px]">Method</th>
                  <th className="p-3 font-normal uppercase tracking-widest text-[10px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries?.length === 0 ? (
                  <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No ledger entries found.</td></tr>
                ) : (
                  entries?.slice(0, 10).map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/20">
                      <td className="p-3 truncate max-w-[100px]">{entry.id}</td>
                      <td className="p-3 text-green-500">{entry.amount}</td>
                      <td className="p-3 uppercase">{entry.paymentMethod}</td>
                      <td className="p-3"><span className={`px-2 py-1 rounded text-[10px] uppercase tracking-widest ${entry.status === 'available' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>{entry.status}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
