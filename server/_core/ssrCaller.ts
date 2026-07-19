import type { Request, Response } from "express";
import { TRPCError } from "@trpc/server";
import { appRouter } from "../routers";
import { createContext } from "./context";
import type { SsrPrefetch } from "../../client/src/ssr/prefetch";

/**
 * SSRプリフェッチ用のin-processカラー。
 * ここに列挙したprocedureのみSSRから到達可能（mutation/adminは含めない）。
 * すべてviewer非依存の公開データのみを返すこと（dehydrated stateは全訪問者共通のHTMLに焼き込まれる）。
 */
export async function buildSsrPrefetch(
  req: Request,
  res: Response
): Promise<SsrPrefetch> {
  const ctx = await createContext({ req, res } as never);
  const caller = appRouter.createCaller(ctx);
  /** NOT_FOUNDのみnullへ変換し、それ以外（DB障害等）は再throw → 外側でシェルフォールバック */
  const nullOnNotFound = async <T,>(p: Promise<T>): Promise<T | null> => {
    try {
      return await p;
    } catch (e) {
      if (e instanceof TRPCError && e.code === "NOT_FOUND") return null;
      throw e;
    }
  };
  return {
    statsOverview: () => caller.stats.overview(),
    statsByPrefecture: prefecture => caller.stats.byPrefecture({ prefecture }),
    statsByPrefectureFields: prefecture =>
      caller.stats.byPrefectureFields({ prefecture }),
    orgsGetById: id => nullOnNotFound(caller.orgs.getById(id)),
    orgsSearch: input =>
      caller.orgs.search(input as Parameters<typeof caller.orgs.search>[0]),
    updatesList: () => caller.updates.list(),
    updatesDetail: baseDate =>
      nullOnNotFound(caller.updates.detail({ baseDate })),
    articlesList: () => caller.articles.list(),
    articlesBySlug: slug => nullOnNotFound(caller.articles.bySlug({ slug })),
  };
}
