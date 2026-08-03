export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Manus依存を切るための自前AI設定（server/_core/llm.tsで使用）。
  // ANTHROPIC_API_KEY未設定時はSDKが ANTHROPIC_AUTH_TOKEN 等にフォールバックする。
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-opus-5",
  // Manus OAuth依存を切るための自前認証設定（server/_core/sdk.tsで使用）。
  // ADMIN_PASSWORD: /admin ダッシュボードのオーナーログイン用パスワード。
  // CRON_SECRET: 週次/月次の同期ジョブ（旧Manus Agent cron）を自前のスケジューラ
  //   （GitHub Actions等）から叩く際の共有シークレット（Authorization: Bearer）。
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
};
