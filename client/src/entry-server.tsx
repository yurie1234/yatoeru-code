import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { dehydrate } from "@tanstack/react-query";
import { Router } from "wouter";
import superjson from "superjson";
import { trpc } from "@/lib/trpc";
import { httpBatchLink } from "@trpc/client";
import App from "./App";
import { prefetchForPath, type SsrPrefetch, type HeadMeta } from "./ssr/prefetch";

export type RenderResult = {
  html: string;
  dehydratedState: unknown;
  head: HeadMeta;
};

export async function render(url: string, prefetch: SsrPrefetch): Promise<RenderResult> {
  // サーバー専用QueryClient：リトライなし（失敗時は即シェルフォールバック）
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  // 最初の"?"で自前分割（wouter任せは trailing-"?" / 二重"?" の罠がある）
  const qi = url.indexOf("?");
  const ssrPath = qi === -1 ? url : url.slice(0, qi);
  const ssrSearch = qi === -1 ? "" : url.slice(qi + 1);
  const head = await prefetchForPath(url, queryClient, prefetch);
  // ダミーtRPCクライアント：plain useQueryはrenderToString中にfetchしない
  const trpcClient = trpc.createClient({
    links: [httpBatchLink({ url: "/api/trpc", transformer: superjson })],
  });
  const html = renderToString(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Router ssrPath={ssrPath} ssrSearch={ssrSearch}>
          <App />
        </Router>
      </QueryClientProvider>
    </trpc.Provider>
  );
  return { html, dehydratedState: dehydrate(queryClient), head };
}
