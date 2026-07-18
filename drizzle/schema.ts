import {
  boolean,
  decimal,
  int,
  json,
  mediumtext,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 登録支援機関（入管庁登録簿 11,448件を構造化）
 */
export const supportOrgs = mysqlTable("support_orgs", {
  id: int("id").autoincrement().primaryKey(),
  /** 登録番号 例: 19登-000001 */
  regNo: varchar("regNo", { length: 32 }).notNull().unique(),
  /** 登録年月日 例: 2019-04-25 */
  regDate: varchar("regDate", { length: 16 }),
  /** 氏名又は名称 */
  name: varchar("name", { length: 255 }).notNull(),
  /** かな読み（検索用・任意） */
  postal: varchar("postal", { length: 16 }),
  address: text("address"),
  prefecture: varchar("prefecture", { length: 16 }),
  phone: varchar("phone", { length: 32 }),
  representative: varchar("representative", { length: 255 }),
  officeName: varchar("officeName", { length: 255 }),
  /** 任意的支援業務の実施有無 */
  optionalSupport: boolean("optionalSupport").default(false),
  /** 支援業務開始予定年月日 */
  startDate: varchar("startDate", { length: 16 }),
  /** 対応可能言語（正規化済み配列） */
  languages: json("languages").$type<string[]>(),
  languagesRaw: text("languagesRaw"),
  note: text("note"),
  /** 掲載プラン: free=登録簿由来 / paid=有料掲載 */
  plan: mysqlEnum("plan", ["free", "paid"]).default("free").notNull(),
  /** 料金目安（月額/人・円）自己申告・取材による */
  monthlyFeeMin: int("monthlyFeeMin"),
  monthlyFeeMax: int("monthlyFeeMax"),
  /** 初期費用目安（円） */
  initialFeeMin: int("initialFeeMin"),
  initialFeeMax: int("initialFeeMax"),
  /** 対応分野（特定技能分野スラッグ配列） */
  fields: json("fields").$type<string[]>(),
  /** 処分歴フラグと詳細 */
  hasPenalty: boolean("hasPenalty").default(false),
  penaltyDetail: text("penaltyDetail"),
  /** 実績: 支援中の外国人数など（取材・公表データ） */
  supportedWorkers: int("supportedWorkers"),
  description: text("description"),
  websiteUrl: varchar("websiteUrl", { length: 512 }),
  /** 口コミ集計キャッシュ */
  reviewCount: int("reviewCount").default(0).notNull(),
  ratingAvg: decimal("ratingAvg", { precision: 3, scale: 2 }),
  /** 新規受入企業の相談ステータス（本人確認済みの申告） open=受付中 / open_active=受付中（積極受入） / paused=一時停止 / unknown=未確認 */
  consultStatus: mysqlEnum("consultStatus", ["unknown", "open", "open_active", "paused"]).default("unknown").notNull(),
  /** 希望する相談条件：受けたい業種（特定技能分野スラッグ配列。"全業種"を含む場合は全分野対象） */
  preferredFields: json("preferredFields").$type<string[]>(),
  /** 希望する相談条件：受けたい地域（都道府県名・地方名・"全国"の配列） */
  preferredRegions: json("preferredRegions").$type<string[]>(),
  /** 希望する相談条件：備考（公開可の補足。例「北海道・九州は人数により応相談」） */
  preferredNote: text("preferredNote"),
  /** 内部メモ（完全非公開：送客窓口・担当者名・価格反応・対応履歴。公開ページ・API・構造化データに絶対に出力しない） */
  internalMemo: text("internalMemo"),
  /** エイリアス（通称・サービス名。検索インデックスと構造化データのalternateNameに使用） */
  aliases: json("aliases").$type<string[]>(),
  /** 運営による実確認日（掲載情報 運営確認済み）。親和性スコアの鮮度加点に使用。確認は無料で全機関に開かれており有料プランとは一切非連動 */
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SupportOrg = typeof supportOrgs.$inferSelect;
export type InsertSupportOrg = typeof supportOrgs.$inferInsert;

/**
 * 口コミ（3段階設計: Day1=器、第2段階=検証済み取材レビュー、第3段階=UGC）
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  /** verified=運営による取材・検証済み / user=UGC投稿 */
  source: mysqlEnum("source", ["verified", "user"]).default("user").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  rating: int("rating").notNull(), // 1-5
  title: varchar("title", { length: 255 }),
  body: text("body"),
  /** 投稿者属性（企業規模・業種など匿名化済み） */
  reviewerCompanyType: varchar("reviewerCompanyType", { length: 128 }),
  reviewerIndustry: varchar("reviewerIndustry", { length: 128 }),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * URL診断履歴
 */
export const diagnoses = mysqlTable("diagnoses", {
  id: int("id").autoincrement().primaryKey(),
  inputUrl: varchar("inputUrl", { length: 1024 }).notNull(),
  companyName: varchar("companyName", { length: 255 }),
  industry: varchar("industry", { length: 255 }),
  /** 診断結果JSON: 該当分野・適合スコア・受入可能枠・概算コスト */
  result: json("result"),
  /** 適合スコア 0-100 */
  matchScore: int("matchScore"),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Diagnosis = typeof diagnoses.$inferSelect;
export type InsertDiagnosis = typeof diagnoses.$inferInsert;

/**
 * 一括相談リード（マネタイズの核）
 */
export const consultations = mysqlTable("consultations", {
  id: int("id").autoincrement().primaryKey(),
  /** 選択された支援機関ID配列（最大5社） */
  orgIds: json("orgIds").$type<number[]>().notNull(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  prefecture: varchar("prefecture", { length: 16 }),
  industry: varchar("industry", { length: 128 }),
  /** 希望分野 */
  field: varchar("field", { length: 128 }),
  /** 受入予定人数 */
  headcount: varchar("headcount", { length: 32 }),
  message: text("message"),
  /** 診断からの流入か */
  diagnosisId: int("diagnosisId"),
  /** 第三者提供（選択支援機関への提供）同意日時。同意なしでの登録は不可 */
  consentedAt: timestamp("consented_at"),
  status: mysqlEnum("status", ["new", "sent", "closed"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Consultation = typeof consultations.$inferSelect;
export type InsertConsultation = typeof consultations.$inferInsert;

/**
 * 有料プラン申込み（掲載事業者向け・月額固定型）
 */
export const planApplications = mysqlTable("plan_applications", {
  id: int("id").autoincrement().primaryKey(),
  orgName: varchar("orgName", { length: 255 }).notNull(),
  regNo: varchar("regNo", { length: 32 }),
  contactName: varchar("contactName", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  /** standard=月額3万円 / premium=月額8万円 */
  plan: mysqlEnum("plan", ["standard", "premium"]).notNull(),
  message: text("message"),
  /** プライバシーポリシー同意日時 */
  consentedAt: timestamp("consented_at"),
  status: mysqlEnum("status", ["new", "contacted", "active", "cancelled"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PlanApplication = typeof planApplications.$inferSelect;
export type InsertPlanApplication = typeof planApplications.$inferInsert;

/**
 * AI提案書生成履歴（特定技能導入提案書）
 */
export const proposals = mysqlTable("proposals", {
  id: int("id").autoincrement().primaryKey(),
  diagnosisId: int("diagnosisId"),
  companyName: varchar("companyName", { length: 255 }),
  /** 生成された提案書本文（Markdown、DB実体はMEDIUMTEXT） */
  content: mediumtext("content"),
  email: varchar("email", { length: 320 }),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = typeof proposals.$inferInsert;

/**
 * 登録簿スナップショット（週次差分の基準。入管庁登録簿の取得履歴）
 */
export const registrySnapshots = mysqlTable("registry_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  /** 入管庁発表の基準日 例: 2026-07-09 */
  baseDate: varchar("baseDate", { length: 16 }).notNull().unique(),
  /** 基準日時点の登録件数 */
  totalCount: int("totalCount").notNull(),
  /** 取得元ExcelのURL（出典明記用） */
  sourceUrl: varchar("sourceUrl", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RegistrySnapshot = typeof registrySnapshots.$inferSelect;
export type InsertRegistrySnapshot = typeof registrySnapshots.$inferInsert;

/**
 * 登録簿差分（新規登録・抹消を機関単位で記録。週次差分記事のデータ源）
 */
export const registryChanges = mysqlTable("registry_changes", {
  id: int("id").autoincrement().primaryKey(),
  /** 対応するスナップショットID */
  snapshotId: int("snapshotId").notNull(),
  /** 差分種別: added=新規登録 / removed=抹消 */
  changeType: mysqlEnum("changeType", ["added", "removed"]).notNull(),
  regNo: varchar("regNo", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  prefecture: varchar("prefecture", { length: 16 }),
  regDate: varchar("regDate", { length: 16 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RegistryChange = typeof registryChanges.$inferSelect;
export type InsertRegistryChange = typeof registryChanges.$inferInsert;

/**
 * 機関別イベント計測（問い合わせ・閲覧・診断などのファーストパーティ計測）
 * orgId が null の行はサイト全体イベント（診断開始・完了など）
 */
export const orgEvents = mysqlTable("org_events", {
  id: int("id").autoincrement().primaryKey(),
  /** 対象機関ID（サイト全体イベントは null） */
  orgId: int("orgId"),
  /** イベント種別: org_detail_view / consult_submit / bulk_consult_submit / phone_tap / website_click / diagnose_start / diagnose_complete / proposal_generate */
  eventType: varchar("eventType", { length: 48 }).notNull(),
  /** 流入元識別（URLパラメータ ?src= 等） */
  source: varchar("source", { length: 128 }),
  /** イベント発生ページパス */
  path: varchar("path", { length: 512 }),
  /** リファラ（ドメインのみ保存） */
  referrer: varchar("referrer", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrgEvent = typeof orgEvents.$inferSelect;
export type InsertOrgEvent = typeof orgEvents.$inferInsert;
