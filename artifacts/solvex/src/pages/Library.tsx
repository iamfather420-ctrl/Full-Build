import { DashboardLayout } from "@/components/DashboardLayout";
import { useGetMyLibrary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Library() {
  const { data: library, isLoading } = useGetMyLibrary();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-mono font-bold mb-2 text-primary uppercase">Decrypted Library</h1>
          <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest">Your acquired intellectual assets.</p>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground font-mono">Accessing secure storage...</div>
        ) : library?.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-border text-muted-foreground font-mono">
            No assets in your library.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {library?.map((item) => (
              <Card key={item.id} className="bg-card border-border flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="text-primary border-primary font-mono uppercase text-xs">Decrypted</Badge>
                    <span className="text-xs text-muted-foreground font-mono">{new Date(item.purchasedAt).toLocaleDateString()}</span>
                  </div>
                  <CardTitle className="font-mono text-lg">{item.product?.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col space-y-4">
                  <div className="bg-muted p-4 rounded font-mono text-sm flex-1 overflow-y-auto max-h-48 text-foreground/80">
                    {item.product?.solution || "Solution data unavailable."}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground mt-4 pt-4 border-t border-border">
                    <div>Order ID: {item.orderId}</div>
                    <div>Asset ID: {item.productId}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
