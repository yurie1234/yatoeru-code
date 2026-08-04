import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { clientSafeMessage } from "./sanitizeError";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  /**
   * 公開APIのエラー応答から内部情報を落とす。
   * 診断APIの500応答にAnthropic APIキーの値がそのまま含まれていたため、
   * INTERNAL_SERVER_ERROR は定型文に置き換え、他のメッセージも秘密らしき
   * 文字列をマスクする。原因の特定はサーバーログ側で行う。
   */
  errorFormatter({ shape, error }) {
    const code = shape.data?.code;
    if (code === "INTERNAL_SERVER_ERROR") {
      // 原因はログに残す（クライアントには返さない）
      console.error("[trpc] internal error", error);
    }
    return {
      ...shape,
      message: clientSafeMessage(code, shape.message),
      data: shape.data
        ? { ...shape.data, stack: undefined, ...(code === "INTERNAL_SERVER_ERROR" ? { path: shape.data.path } : {}) }
        : shape.data,
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
