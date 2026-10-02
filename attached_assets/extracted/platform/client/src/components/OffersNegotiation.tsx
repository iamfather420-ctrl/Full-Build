import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, timeAgo } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Send,
  CheckCircle,
  XCircle,
  MessageCircle,
  TrendingUp,
  Clock,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface OffersNegotiationProps {
  problemId: number;
  clientId: number;
  originalPaymentOffer: number;
  onOfferAccepted?: () => void;
}

export default function OffersNegotiation({
  problemId,
  clientId,
  originalPaymentOffer,
  onOfferAccepted,
}: OffersNegotiationProps) {
  const { user } = useAuth();
  const isClient = user?.id === clientId;
  const isSolver = user?.role === "admin";

  const [offerAmount, setOfferAmount] = useState(originalPaymentOffer);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: offers = [], refetch } = trpc.offers.getByProblem.useQuery({ problemId });

  const createOffer = trpc.offers.create.useMutation({
    onSuccess: () => {
      toast.success("Offer sent!");
      setOfferAmount(originalPaymentOffer);
      setMessage("");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const counterOffer = trpc.offers.counter.useMutation({
    onSuccess: () => {
      toast.success("Counter-offer sent!");
      setOfferAmount(originalPaymentOffer);
      setMessage("");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const acceptOffer = trpc.offers.accept.useMutation({
    onSuccess: () => {
      toast.success("Offer accepted! Escrow is now active.");
      refetch();
      onOfferAccepted?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectOffer = trpc.offers.reject.useMutation({
    onSuccess: () => {
      toast.success("Offer rejected.");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const pendingOffers = offers.filter((o) => o.status === "pending");
  const activeNegotiation = pendingOffers.length > 0;

  return (
    <div className="space-y-6">
      {/* Negotiation Status */}
      {activeNegotiation && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-100">Active Negotiation</p>
              <p className="text-xs text-amber-200 mt-1">
                {pendingOffers.length} pending offer{pendingOffers.length !== 1 ? "s" : ""} awaiting response
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Offers History */}
      {offers.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            Negotiation History
          </h3>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className={`p-4 rounded-lg border transition-colors ${
                  offer.status === "accepted"
                    ? "border-primary/30 bg-primary/5"
                    : offer.status === "rejected"
                    ? "border-destructive/30 bg-destructive/5"
                    : offer.status === "countered"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-border bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {offer.status === "accepted" && <CheckCircle className="w-4 h-4 text-primary" />}
                    {offer.status === "rejected" && <XCircle className="w-4 h-4 text-destructive" />}
                    {offer.status === "countered" && <TrendingUp className="w-4 h-4 text-amber-400" />}
                    {offer.status === "pending" && <Clock className="w-4 h-4 text-muted-foreground" />}

                    <span className="text-xs font-semibold capitalize text-foreground">
                      {offer.fromUserId === user?.id ? "Your Offer" : "Received Offer"}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-primary">{formatCurrency(parseFloat(offer.amount))}</span>
                </div>

                {offer.message && (
                  <p className="text-sm text-muted-foreground mb-2 italic">"{offer.message}"</p>
                )}

                <p className="text-xs text-muted-foreground">{timeAgo(offer.createdAt)}</p>

                {/* Action Buttons */}
                {offer.status === "pending" && offer.toUserId === user?.id && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectOffer.mutate({ offerId: offer.id })}
                      disabled={rejectOffer.isPending}
                      className="flex-1"
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => acceptOffer.mutate({ offerId: offer.id })}
                      disabled={acceptOffer.isPending}
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Accept
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Make/Counter Offer Form */}
      {((isSolver && !activeNegotiation) || (isClient && activeNegotiation)) && (
        <div className="p-4 rounded-xl border border-primary/20 bg-card">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            {activeNegotiation ? (
              <>
                <TrendingUp className="w-4 h-4 text-amber-400" />
                Counter-Offer
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4 text-primary" />
                Make an Offer
              </>
            )}
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Proposed Amount (USD)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground">$</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:border-primary/50 focus:outline-none text-sm"
                  placeholder="100"
                />
              </div>
              {offerAmount !== originalPaymentOffer && (
                <p className="text-xs text-muted-foreground mt-1">
                  {offerAmount > originalPaymentOffer
                    ? `+${formatCurrency(offerAmount - originalPaymentOffer)} from original`
                    : `-${formatCurrency(originalPaymentOffer - offerAmount)} from original`}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Message (optional)
              </label>
              <Textarea
                placeholder="Explain your offer..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[80px] text-sm bg-background border-border focus:border-primary/50 resize-none"
              />
            </div>

            <Button
              onClick={() => {
                if (activeNegotiation && pendingOffers.length > 0) {
                  counterOffer.mutate({
                    offerId: pendingOffers[0].id,
                    amount: offerAmount,
                    message: message || undefined,
                  });
                } else {
                  createOffer.mutate({
                    problemId,
                    amount: offerAmount,
                    message: message || undefined,
                  });
                }
              }}
              disabled={createOffer.isPending || counterOffer.isPending || offerAmount < 1}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Send className="w-4 h-4 mr-2" />
              {activeNegotiation ? "Send Counter-Offer" : "Send Offer"}
            </Button>
          </div>
        </div>
      )}

      {/* Info for clients without active negotiation */}
      {isClient && !activeNegotiation && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-100">Waiting for Offers</p>
              <p className="text-xs text-blue-200 mt-1">
                Solvers can make offers below the posted amount. You can accept, reject, or counter-offer.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
