import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Lock, Shield, CreditCard, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface EscrowPaymentProps {
  problemId: number;
  amount: number;
  problemTitle: string;
  onSuccess?: () => void;
}

export default function EscrowPayment({ problemId, amount, problemTitle, onSuccess }: EscrowPaymentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");

  const createPaymentIntent = trpc.escrow.createPaymentIntent.useMutation();

  const handlePayment = async () => {
    setIsProcessing(true);
    setPaymentStatus("processing");

    try {
      // Create payment intent and get client secret
      const result = await createPaymentIntent.mutateAsync({
        problemId,
        amount,
      });

      if (!result.clientSecret) {
        throw new Error("No client secret returned");
      }

      // Load Stripe.js dynamically
      const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      if (!stripePublicKey) {
        throw new Error("Stripe publishable key not configured");
      }

      const { loadStripe } = await import("@stripe/stripe-js");
      const stripe = await loadStripe(stripePublicKey);
      if (!stripe) throw new Error("Failed to load Stripe");

      // Confirm payment using Stripe Elements redirect
      // For simplicity, we redirect to a hosted payment page
      toast.info("Redirecting to secure payment...", { duration: 2000 });

      // Use confirmPayment with redirect
      const { error } = await stripe.confirmPayment({
        clientSecret: result.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/problems/${problemId}?payment=success`,
          payment_method_data: {
            billing_details: {},
          },
        },
      });

      if (error) {
        throw new Error(error.message ?? "Payment failed");
      }

      setPaymentStatus("success");
      toast.success("Payment successful! Escrow funded.");
      onSuccess?.();
    } catch (err: any) {
      console.error("[EscrowPayment] Error:", err);
      setPaymentStatus("error");
      toast.error(err.message ?? "Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (paymentStatus === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle className="w-10 h-10 text-emerald-400" />
        <h3 className="font-semibold text-lg">Escrow Funded!</h3>
        <p className="text-muted-foreground text-sm">
          {formatCurrency(amount)} is now held in secure escrow. The solver will be notified.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Escrow explanation */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Secure Escrow Protection</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your payment is held safely in escrow. Funds are only released to the solver after our AI
              verifies the solution is correct. If the solution fails verification, you get a full refund.
            </p>
          </div>
        </div>
      </div>

      {/* Payment summary */}
      <div className="p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Problem</span>
          <span className="text-sm font-medium text-right max-w-[60%] truncate">{problemTitle}</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Escrow Amount</span>
          <span className="text-lg font-bold text-primary">{formatCurrency(amount)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Platform Fee</span>
          <span className="text-sm text-muted-foreground">$0.00</span>
        </div>
        <div className="border-t border-border mt-3 pt-3 flex items-center justify-between">
          <span className="text-sm font-semibold">Total</span>
          <span className="text-lg font-bold">{formatCurrency(amount)}</span>
        </div>
      </div>

      {/* Security badges */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Lock className="w-3 h-3" />
          <span>256-bit SSL</span>
        </div>
        <div className="flex items-center gap-1">
          <Shield className="w-3 h-3" />
          <span>Stripe Secure</span>
        </div>
        <div className="flex items-center gap-1">
          <CreditCard className="w-3 h-3" />
          <span>All cards accepted</span>
        </div>
      </div>

      {paymentStatus === "error" && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Payment failed. Please try again or use a different card.</span>
        </div>
      )}

      <Button
        onClick={handlePayment}
        disabled={isProcessing}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-semibold"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="w-4 h-4 mr-2" />
            Fund Escrow — {formatCurrency(amount)}
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Test card: 4242 4242 4242 4242 · Any future date · Any CVC
      </p>
    </div>
  );
}
