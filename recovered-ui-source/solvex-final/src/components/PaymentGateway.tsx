import React, { useState } from 'react';
import { PaymentProvider } from '../types';
import { CreditCard, Wallet, Smartphone, Coins, Shield, Check, Plus, ArrowRight, ExternalLink, RefreshCw } from 'lucide-react';

interface PaymentGatewayProps {
  providers: PaymentProvider[];
  onToggleProvider: (id: string) => void;
  onAddTransaction: (provider: string, amount: number, item: string) => void;
}

export default function PaymentGateway({ providers, onToggleProvider, onAddTransaction }: PaymentGatewayProps) {
  // Checkout simulator state
  const [selectedProvider, setSelectedProvider] = useState('stripe');
  const [checkoutAmount, setCheckoutAmount] = useState('99');
  const [checkoutItem, setCheckoutItem] = useState('Autonomous API Template Integration');
  const [isLoading, setIsLoading] = useState(false);
  
  const [checkoutResult, setCheckoutResult] = useState<any | null>(null);
  const [activeSession, setActiveSession] = useState<boolean>(false);

  // Icon mapping
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'CreditCard': return <CreditCard className="h-5 w-5" />;
      case 'Wallet': return <Wallet className="h-5 w-5" />;
      case 'Smartphone': return <Smartphone className="h-5 w-5" />;
      case 'Coins': return <Coins className="h-5 w-5" />;
      default: return <Shield className="h-5 w-5" />;
    }
  };

  const handleCreateCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setCheckoutResult(null);

    try {
      const response = await fetch('/api/pay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          amount: parseFloat(checkoutAmount) * 100, // cents
          currency: 'USD',
          templateId: 'autonomous_001',
          metadata: {
            item: checkoutItem,
            timestamp: new Date().toISOString()
          }
        })
      });

      const data = await response.json();
      setCheckoutResult(data);
      setActiveSession(true);
    } catch (err) {
      console.error('Failed to create payment checkout:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateSuccess = () => {
    if (!checkoutResult) return;
    onAddTransaction(
      checkoutResult.provider, 
      checkoutResult.amount / 100, 
      checkoutItem
    );
    setActiveSession(false);
    setCheckoutResult(null);
  };

  const handleSimulateCancel = () => {
    setActiveSession(false);
    setCheckoutResult(null);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" id="payment_gateway_module">
      {/* Connected Providers List */}
      <div className="xl:col-span-1 border border-neutral-800 bg-neutral-950 p-6 rounded-lg glow-border flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-emerald-400" />
              <h2 className="font-display font-medium text-lg text-white">Unified API Handshakes</h2>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2 py-0.5 rounded">
              GATEWAY ON
            </span>
          </div>

          <p className="text-xs text-neutral-400 mb-6 font-sans">
            Toggle on integration providers in the Unified.to registry. All active switches automatically map to the server's unified endpoint.
          </p>

          <div className="space-y-3">
            {providers.map((p) => {
              const isActive = p.status === 'active' || p.status === 'configured';
              return (
                <div 
                  key={p.id} 
                  id={`provider_card_${p.id}`}
                  className={`
                    flex items-center justify-between p-3 rounded border transition duration-150
                    ${isActive ? 'border-neutral-800 bg-neutral-900/35' : 'border-neutral-900/60 bg-black opacity-60 hover:opacity-85'}
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded ${isActive ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-900' : 'bg-neutral-950 text-neutral-600 border border-neutral-900'}`}>
                      {getIcon(p.icon)}
                    </div>
                    <div>
                      <h3 className="text-xs font-mono font-medium text-white">{p.name}</h3>
                      <span className="text-[10px] font-mono text-neutral-500 block">
                        {p.connectionId ? p.connectionId : 'Not Configured'}
                      </span>
                    </div>
                  </div>

                  <button
                    id={`toggle_btn_${p.id}`}
                    onClick={() => onToggleProvider(p.id)}
                    className={`
                      text-[10px] font-mono font-bold px-2.5 py-1 rounded transition duration-150 border
                      ${isActive 
                        ? 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700' 
                        : 'bg-cyan-950 text-cyan-400 border-cyan-900 hover:bg-cyan-900 hover:text-white'}
                    `}
                  >
                    {isActive ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-[9px] font-mono text-neutral-600 mt-6 pt-4 border-t border-neutral-900">
          PROPRIETARY MULTI-MARKET TETHER PROTOCOLS ACTIVATED
        </div>
      </div>

      {/* Interactive Unified Transaction Sandbox */}
      <div className="xl:col-span-2 border border-neutral-800 bg-neutral-950 p-6 rounded-lg glow-border flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-4 border-b border-neutral-900 pb-3">
            <RefreshCw className="h-4 w-4 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
            <div>
              <h3 className="font-display font-medium text-white">Unified Transaction API Sandbox</h3>
              <span className="text-[10px] font-mono text-neutral-500 uppercase">Interactive Payment Routing</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Selection Form */}
            <form onSubmit={handleCreateCheckout} className="space-y-4">
              <div>
                <label className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">Target Payment Provider</label>
                <select
                  id="select_payment_provider"
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs font-mono p-2.5 rounded text-white focus:outline-none focus:border-cyan-500"
                >
                  {providers.filter(p => p.status === 'active' || p.status === 'configured').map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">Price (USD)</label>
                  <input
                    id="input_checkout_price"
                    type="number"
                    value={checkoutAmount}
                    onChange={(e) => setCheckoutAmount(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs font-mono p-2.5 rounded text-white focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. 99"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">Currency</label>
                  <div className="w-full bg-neutral-950 border border-neutral-900 text-xs font-mono p-2.5 rounded text-neutral-400 text-center">
                    USD
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">Business Package Artifact</label>
                <input
                  id="input_checkout_item"
                  type="text"
                  value={checkoutItem}
                  onChange={(e) => setCheckoutItem(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs font-mono p-2.5 rounded text-white focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. Autonomous APK Build Template"
                />
              </div>

              <button
                id="btn_initialize_payment"
                type="submit"
                disabled={isLoading || activeSession}
                className="w-full flex items-center justify-center space-x-2 text-xs font-mono font-bold bg-white text-black py-3 rounded hover:bg-neutral-200 transition disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Initializing Transaction Ingress...</span>
                ) : (
                  <>
                    <span>Generate Checkout Endpoint</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Ingress payload / Simulated Checkout Window */}
            <div className="border border-neutral-900 rounded bg-black/60 p-4 font-mono text-[11px] flex flex-col justify-between overflow-hidden">
              {activeSession && checkoutResult ? (
                /* LIVE HANDSHAKE WINDOW */
                <div className="flex flex-col justify-between h-full space-y-4" id="simulated_checkout_window">
                  <div>
                    <div className="flex items-center justify-between text-cyan-400 border-b border-neutral-900 pb-2 mb-3">
                      <span className="flex items-center space-x-1.5 font-bold">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                        <span>CHECKOUT SESSION SECURED</span>
                      </span>
                      <span>v1.0.0</span>
                    </div>

                    <div className="space-y-2 text-neutral-300">
                      <div>
                        <span className="text-neutral-500 text-[10px] uppercase block">Sovereign Transaction Ref</span>
                        <span className="text-white text-xs font-bold font-mono">{checkoutResult.transactionId}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <span className="text-neutral-500 text-[10px] uppercase block">Provider</span>
                          <span className="text-cyan-400 uppercase font-bold">{checkoutResult.provider}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500 text-[10px] uppercase block">Clearing Value</span>
                          <span className="text-emerald-400 font-bold">${(checkoutResult.amount / 100).toFixed(2)} USD</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-neutral-500 text-[10px] uppercase block">Destination URI</span>
                        <span className="text-neutral-400 text-[10px] break-all border border-neutral-900 p-1.5 block bg-neutral-950/60 rounded">
                          {checkoutResult.checkoutUrl}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-neutral-900">
                    <button
                      id="btn_checkout_success"
                      onClick={handleSimulateSuccess}
                      className="w-full flex items-center justify-center space-x-1.5 bg-emerald-500 text-black py-2.5 rounded font-bold hover:bg-emerald-400 transition"
                    >
                      <Check className="h-4 w-4" />
                      <span>Simulate Successful Payment</span>
                    </button>
                    
                    <button
                      id="btn_checkout_cancel"
                      onClick={handleSimulateCancel}
                      className="w-full flex items-center justify-center space-x-1.5 border border-rose-900 bg-rose-950/15 text-rose-400 py-2 rounded hover:bg-rose-950/45 transition"
                    >
                      <span>Terminate Session Handshake</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* JSON DATA MONITOR */
                <div className="h-full flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-neutral-500 block uppercase mb-2">Unified.to REST API Output Monitor</span>
                    <div className="p-3 bg-neutral-950/80 rounded border border-neutral-900 h-44 overflow-y-auto font-mono text-[10px] text-cyan-400 no-scrollbar">
                      {checkoutResult ? (
                        <pre className="whitespace-pre-wrap">{JSON.stringify(checkoutResult, null, 2)}</pre>
                      ) : (
                        <div className="text-neutral-600 flex flex-col items-center justify-center h-full text-center">
                          <span>Waiting for transaction trigger...</span>
                          <span className="text-[9px] mt-1">Configure parameters and click Generate.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-[10px] text-neutral-500 pt-3 border-t border-neutral-950 flex justify-between items-center">
                    <span>SECURITY: SHIELD_PROT_v4</span>
                    <span>HTTPS CERT: VERIFIED</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-[10px] font-mono text-neutral-500 mt-4 border-t border-neutral-900 pt-4 flex justify-between">
          <span>STATION ENDPOINT: /api/pay/create</span>
          <span>AUTONOMOUS ENGINE STATUS: LIVE</span>
        </div>
      </div>
    </div>
  );
}
