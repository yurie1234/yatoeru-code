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
import GuideIkuseiShuro from "./pages/GuideIkuseiShuro";
import GuideKanriShienKikan from "./pages/GuideKanriShienKikan";
import Home from "./pages/Home";
import OrgDetail from "./pages/OrgDetail";
// 検証期間中は価格ページを非公開（2026-07-16 決定）。
// 価格はヒアリング30件の回答から逆算して確定するため、確定前に公開すると価格発見の機会を失う。
// GO判定後・価格確定後に以下のimportとルートを復活させること。
// import Pricing from "./pages/Pricing";
import Proposal from "./pages/Proposal";
import Region from "./pages/Region";
import SearchPage from "./pages/Search";
import Stats from "./pages/Stats";
import UpdateDetail from "./pages/UpdateDetail";
import Updates from "./pages/Updates";
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
      {/* <Route path={"/pricing"} component={Pricing} /> ← 検証期間中非公開（上記コメント参照） */}
      <Route path={"/stats"} component={Stats} />
      <Route path={"/updates"} component={Updates} />
      <Route path={"/updates/:baseDate"} component={UpdateDetail} />
      <Route path={"/region/:prefecture"} component={Region} />
      <Route path={"/field/:field"} component={Field} />
      <Route path={"/guide/ikusei-shuro"} component={GuideIkuseiShuro} />
      <Route path={"/guide/kanri-shien-kikan"} component={GuideKanriShienKikan} />
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
