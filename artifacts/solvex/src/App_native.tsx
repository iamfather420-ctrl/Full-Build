import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { DaisyFloat } from "./components/DaisyFloat";
import Home from "./pages/Home";
import Marketplace from "./pages/Marketplace";
import ProductDetail from "./pages/ProductDetail";
import BrainConsole from "./pages/BrainConsole";
import ChallengeHub from "./pages/ChallengeHub";
import Library from "./pages/Library";
import OwnerDashboard from "./pages/OwnerDashboard";
import Analytics from "./pages/Analytics";
import OutreachOps from "./pages/OutreachOps";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/product/:id" component={ProductDetail} />
      <Route path="/brain" component={BrainConsole} />
      <Route path="/challenges" component={ChallengeHub} />
      <Route path="/library" component={Library} />
      <Route path="/owner" component={OwnerDashboard} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/outreach" component={OutreachOps} />
      <Route path="/login" component={() => <div className="min-h-screen flex items-center justify-center bg-background"><a href="/api/auth/login" className="text-primary font-mono text-xl hover:underline">Authenticate via Manus</a></div>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
        <DaisyFloat />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
