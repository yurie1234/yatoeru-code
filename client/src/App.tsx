import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import ColumnErabikata from "./pages/ColumnErabikata";
import ColumnIkouGuide from "./pages/ColumnIkouGuide";
import ColumnSaiyouCost from "./pages/ColumnSaiyouCost";
import ColumnArticle from "./pages/ColumnArticle";
import Columns from "./pages/Columns";
import ColumnShokaiVsShien from "./pages/ColumnShokaiVsShien";
import Consult from "./pages/Consult";
import Diagnose from "./pages/Diagnose";
import ForOrganizations from "./pages/ForOrganizations";
import Field from "@/pages/Field";
import Area from "@/pages/Area";
import Bunya from "@/pages/Bunya";
import GuideGinouJisshuChigai from "./pages/GuideGinouJisshuChigai";
import GuideIkuseiShuro from "@/pages/GuideIkuseiShuro";
import IkuseiHub from "@/pages/IkuseiHub";
import IkuseiTrackerList from "@/pages/IkuseiTrackerList";
import KanriDetail from "@/pages/KanriDetail";
import IkuseiSchedule from "@/pages/IkuseiSchedule";
import IkuseiChecklist from "@/pages/IkuseiChecklist";
import IkuseiForKanriDantai from "@/pages/IkuseiForKanriDantai";
import GuideIkuseiShuroCost from "./pages/GuideIkuseiShuroCost";
import GuideIkuseiShuroSchedule from "./pages/GuideIkuseiShuroSchedule";
import GuideKanriShienKikan from "./pages/GuideKanriShienKikan";
import GuideTokuteiGinouIkou from "./pages/GuideTokuteiGinouIkou";
import Joseikin from "./pages/Joseikin";
import JoseikinCareerUp from "./pages/JoseikinCareerUp";
import JoseikinGyomuKaizen from "./pages/JoseikinGyomuKaizen";
import JoseikinJinzaiKaihatsu from "./pages/JoseikinJinzaiKaihatsu";
import JoseikinJinzaiKakuho from "./pages/JoseikinJinzaiKakuho";
import JoseikinTrialKoyou from "./pages/JoseikinTrialKoyou";
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
import { About, NeutralityPolicy, Operator, Privacy, Terms } from "./pages/StaticPages";

/** GA4: SPAページ遷移ごとにpage_viewを送信（index.html側はsend_page_view: false） */
function useGaPageView() {
  const [location] = useLocation();
  useEffect(() => {
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    if (typeof gtag === "function") {
      gtag("event", "page_view", {
        page_path: location,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
  }, [location]);
}

function Router() {
  useGaPageView();
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
      <Route path={"/columns"} component={Columns} />
      <Route path={"/columns/shien-kikan-erabikata"} component={ColumnErabikata} />
      <Route path={"/columns/kanri-dantai-ikou-guide"} component={ColumnIkouGuide} />
      <Route path={"/columns/shokai-vs-shien"} component={ColumnShokaiVsShien} />
      <Route path={"/columns/saiyou-cost-hikaku"} component={ColumnSaiyouCost} />
      <Route path={"/columns/:slug"} component={ColumnArticle} />
      <Route path={"/updates"} component={Updates} />
      <Route path={"/updates/:baseDate"} component={UpdateDetail} />
      <Route path={"/region/:prefecture"} component={Region} />
      <Route path={"/field/:field"} component={Field} />
      <Route path="/bunya/:slug" component={Bunya} />
      <Route path="/area/:slug" component={Area} />
      <Route path="/guide/ikusei-shuro" component={GuideIkuseiShuro} />
      <Route path="/ikusei-shuro" component={IkuseiHub} />
      <Route path="/ikusei-shuro/kanri-shien-kikan/list" component={IkuseiTrackerList} />
      {/* 監理団体の詳細。URLは管理IDの小文字（/kanri/i-0001）。
          ikusei.yatoeru.jp の静的ページから本体へ寄せた（ops/22） */}
      <Route path="/kanri/:managementId" component={KanriDetail} />
      <Route path="/ikusei-shuro/schedule" component={IkuseiSchedule} />
      <Route path="/ikusei-shuro/checklist" component={IkuseiChecklist} />
      <Route path="/ikusei-shuro/for-kanri-dantai" component={IkuseiForKanriDantai} />
      <Route path={"/guide/ikusei-shuro-cost"} component={GuideIkuseiShuroCost} />
      <Route path={"/guide/ikusei-shuro-schedule"} component={GuideIkuseiShuroSchedule} />
      <Route path={"/guide/ginou-jisshu-chigai"} component={GuideGinouJisshuChigai} />
      <Route path={"/guide/tokutei-ginou-ikou"} component={GuideTokuteiGinouIkou} />
      <Route path={"/guide/kanri-shien-kikan"} component={GuideKanriShienKikan} />
      <Route path={"/joseikin"} component={Joseikin} />
      <Route path={"/joseikin/jinzai-kakuho"} component={JoseikinJinzaiKakuho} />
      <Route path={"/joseikin/gyomu-kaizen"} component={JoseikinGyomuKaizen} />
      <Route path={"/joseikin/career-up"} component={JoseikinCareerUp} />
      <Route path={"/joseikin/trial-koyou"} component={JoseikinTrialKoyou} />
      <Route path={"/joseikin/jinzai-kaihatsu"} component={JoseikinJinzaiKaihatsu} />
      <Route path={"/for-organizations"} component={ForOrganizations} />
      <Route path={"/about"} component={About} />
      <Route path={"/terms"} component={Terms} />
      <Route path={"/privacy"} component={Privacy} />
      <Route path={"/neutrality-policy"} component={NeutralityPolicy} />
      <Route path={"/operator"} component={Operator} />
      <Route path={"/admin/login"} component={AdminLogin} />
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
