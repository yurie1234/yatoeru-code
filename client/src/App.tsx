import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Admin from "./pages/Admin";
import Consult from "./pages/Consult";
import Diagnose from "./pages/Diagnose";
import Field from "./pages/Field";
import Home from "./pages/Home";
import OrgDetail from "./pages/OrgDetail";
import Pricing from "./pages/Pricing";
import Proposal from "./pages/Proposal";
import Region from "./pages/Region";
import SearchPage from "./pages/Search";
import Stats from "./pages/Stats";
import { About, Privacy, Terms } from "./pages/StaticPages";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/diagnose"} component={Diagnose} />
      <Route path={"/search"} component={SearchPage} />
      <Route path={"/org/:id"} component={OrgDetail} />
      <Route path={"/consult"} component={Consult} />
      <Route path={"/proposal"} component={Proposal} />
      <Route path={"/pricing"} component={Pricing} />
      <Route path={"/stats"} component={Stats} />
      <Route path={"/region/:prefecture"} component={Region} />
      <Route path={"/field/:field"} component={Field} />
      <Route path={"/about"} component={About} />
      <Route path={"/terms"} component={Terms} />
      <Route path={"/privacy"} component={Privacy} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
