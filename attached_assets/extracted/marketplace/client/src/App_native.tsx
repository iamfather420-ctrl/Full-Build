import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import Marketplace from "@/pages/Marketplace";
import ProductDetail from "@/pages/ProductDetail";
import UserLibrary from "@/pages/UserLibrary";
import AdminPanel from "@/pages/AdminPanel";
import OwnerDashboard from "@/pages/OwnerDashboard";
import UserControlPanel from "@/pages/UserControlPanel";
import AnalyticsDashboard from "@/pages/AnalyticsDashboard";
import Login from "@/pages/Login";
import Storefront from "@/pages/Storefront";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Storefront} />
      <Route path={"/login"} component={Login} />
      <Route path={"/marketplace"} component={Marketplace} />
      <Route path={"/product/:id"} component={ProductDetail} />
      <Route path={"/library"} component={UserLibrary} />
      <Route path={"/admin"} component={AdminPanel} />
      <Route path={"/owner"} component={OwnerDashboard} />
      <Route path={"/control"} component={UserControlPanel} />
      <Route path={"/analytics"} component={AnalyticsDashboard} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
