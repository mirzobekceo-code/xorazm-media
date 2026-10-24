import {
  pgTable, pgEnum, serial, integer, text, varchar, boolean, timestamp, jsonb, real,
  primaryKey, index, uniqueIndex,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["specialist", "moderator", "admin"]);
export const genderEnum = pgEnum("gender", ["f", "m"]);
export const profileStatusEnum = pgEnum("profile_status", [
  "draft", "pending", "approved", "rejected", "hidden", "blocked",
]);
export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);
export const moderationEnum = pgEnum("moderation_status", ["pending", "approved", "rejected"]);
export const reportStatusEnum = pgEnum("report_status", ["new", "reviewing", "closed"]);
export const eventTypeEnum = pgEnum("event_type", ["view", "contact_click"]);
export const adEventEnum = pgEnum("ad_event_type", ["impression", "click"]);
export const creativeTypeEnum = pgEnum("creative_type", ["text", "image", "video"]);
export const tgPurposeEnum = pgEnum("tg_token_purpose", ["login", "link"]);
export const tgStatusEnum = pgEnum("tg_token_status", ["pending", "confirmed", "used"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "active", "paused", "ended"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  telegramId: varchar("telegram_id", { length: 32 }).unique(),
  role: roleEnum("role").notNull().default("specialist"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  codeHash: varchar("code_hash", { length: 64 }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("otp_phone_idx").on(t.phone, t.createdAt)]);

/**
 * Telegram orqali kirish/ulash: sayt token yaratadi, foydalanuvchi botda raqamini ulashadi,
 * bot tokenni tasdiqlaydi, sayt (shu brauzer, secret bilan) tokenni ishlatib sessiya ochadi.
 */
export const telegramTokens = pgTable("telegram_tokens", {
  token: varchar("token", { length: 64 }).primaryKey(),
  /** Faqat tokenni yaratgan brauzer biladi; xesh saqlanadi */
  secretHash: varchar("secret_hash", { length: 64 }).notNull(),
  purpose: tgPurposeEnum("purpose").notNull(),
  /** link: qaysi foydalanuvchiga ulanadi */
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  status: tgStatusEnum("status").notNull().default("pending"),
  chatId: varchar("chat_id", { length: 32 }),
  telegramId: varchar("telegram_id", { length: 32 }),
  phone: varchar("phone", { length: 20 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("tg_tokens_chat_idx").on(t.chatId, t.createdAt)]);

/** Kasbga oid maydon ta'rifi: forma va profil sahifasi shundan quriladi. */
export type FieldDef = {
  key: string;
  label: string;
  /** pricelist — "Nomi — narx" qatorlari; map — xarita havolasi */
  type: "text" | "number" | "url" | "textarea" | "pricelist" | "map";
  placeholder?: string;
  hint?: string;
  required?: boolean;
};

export const professions = pgTable("professions", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 40 }).notNull().unique(),
  nameUz: varchar("name_uz", { length: 60 }).notNull(),
  nameRu: varchar("name_ru", { length: 60 }),
  description: varchar("description", { length: 120 }).notNull().default(""),
  unit: varchar("unit", { length: 20 }).notNull(),
  icon: text("icon").notNull().default(""),
  fieldsSchema: jsonb("fields_schema").$type<FieldDef[]>().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const districts = pgTable("districts", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 40 }).notNull().unique(),
  nameUz: varchar("name_uz", { length: 60 }).notNull(),
  nameRu: varchar("name_ru", { length: 60 }),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  professionId: integer("profession_id").notNull().references(() => professions.id),
  extraProfessionId: integer("extra_profession_id").references(() => professions.id),
  fullName: varchar("full_name", { length: 80 }).notNull(),
  birthYear: integer("birth_year"),
  gender: genderEnum("gender"),
  languages: text("languages").array().notNull().default([]),
  bio: varchar("bio", { length: 500 }).notNull().default(""),
  experienceYears: integer("experience_years").notNull().default(0),
  price: integer("price"),
  priceNegotiable: boolean("price_negotiable").notNull().default(false),
  tags: text("tags").array().notNull().default([]),
  /** Showreel va ishlar: YouTube, Instagram, TikTok havolalari (fayl xotirasini tejaydi) */
  videoLinks: text("video_links").array().notNull().default([]),
  status: profileStatusEnum("status").notNull().default("draft"),
  rejectReason: text("reject_reason"),
  isAvailable: boolean("is_available").notNull().default(true),
  extra: jsonb("extra").$type<Record<string, string>>().notNull().default({}),
  rankScore: real("rank_score").notNull().default(0),
  isFeatured: boolean("is_featured").notNull().default(false),
  consentAt: timestamp("consent_at", { withTimezone: true }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [index("profiles_catalog_idx").on(t.professionId, t.status, t.rankScore)]);

export const profileDistricts = pgTable("profile_districts", {
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  districtId: integer("district_id").notNull().references(() => districts.id),
}, (t) => [primaryKey({ columns: [t.profileId, t.districtId] }), index("pd_district_idx").on(t.districtId)]);

export const profileContacts = pgTable("profile_contacts", {
  profileId: integer("profile_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  phone: varchar("phone", { length: 20 }),
  telegram: varchar("telegram", { length: 64 }),
  instagram: varchar("instagram", { length: 64 }),
});

export const bloggerAdmins = pgTable("blogger_admins", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 60 }).notNull(),
  role: varchar("role", { length: 60 }).notNull().default("Reklama bo‘yicha admin"),
  phone: varchar("phone", { length: 20 }).notNull(),
  telegram: varchar("telegram", { length: 64 }),
  sortOrder: integer("sort_order").notNull().default(0),
});

export type Audience = {
  gender: { f: number; m: number };
  ages: [string, number][];
  cities: [string, number][];
};

export const bloggerStats = pgTable("blogger_stats", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  /** Platformalar bo'yicha obunachilar: { instagram: 48200, telegram: 12400 } */
  followers: jsonb("followers").$type<Record<string, number>>().notNull().default({}),
  er: real("er"),
  avgViews: integer("avg_views"),
  storiesReach: integer("stories_reach"),
  audience: jsonb("audience").$type<Audience>(),
  /** Narxlar: [["Stories (1 ta)", 250000], ...] */
  rates: jsonb("rates").$type<[string, number][]>().notNull().default([]),
  topics: varchar("topics", { length: 200 }).notNull().default(""),
  noAds: varchar("no_ads", { length: 200 }).notNull().default(""),
  screenshots: text("screenshots").array().notNull().default([]),
  statDate: timestamp("stat_date", { withTimezone: true }),
  verifiedBy: integer("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("bs_profile_idx").on(t.profileId, t.createdAt)]);

export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  type: mediaTypeEnum("type").notNull(),
  url: text("url").notNull(),
  thumbUrl: text("thumb_url"),
  /** Asl va kichik nusxa birga; xotira hajmini kuzatish uchun */
  sizeBytes: integer("size_bytes").notNull().default(0),
  isCover: boolean("is_cover").notNull().default(false),
  isStatScreenshot: boolean("is_stat_screenshot").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  moderationStatus: moderationEnum("moderation_status").notNull().default("pending"),
  rejectReason: text("reject_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const moderationLog = pgTable("moderation_log", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => profiles.id, { onDelete: "cascade" }),
  mediaId: integer("media_id"),
  moderatorId: integer("moderator_id").references(() => users.id),
  action: varchar("action", { length: 30 }).notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  reason: varchar("reason", { length: 60 }).notNull(),
  text: varchar("text", { length: 1000 }).notNull().default(""),
  reporterPhone: varchar("reporter_phone", { length: 20 }),
  status: reportStatusEnum("status").notNull().default("new"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  type: eventTypeEnum("type").notNull(),
  channel: varchar("channel", { length: 20 }),
  sessionHash: varchar("session_hash", { length: 64 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("events_profile_idx").on(t.profileId, t.createdAt)]);

export const adCampaigns = pgTable("ad_campaigns", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  advertiser: varchar("advertiser", { length: 120 }).notNull().default("Adverto"),
  slots: text("slots").array().notNull().default([]),
  professions: text("professions").array().notNull().default([]),
  districts: text("districts").array().notNull().default([]),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  weight: integer("weight").notNull().default(1),
  isFallback: boolean("is_fallback").notNull().default(false),
  status: campaignStatusEnum("status").notNull().default("draft"),
  ...timestamps,
});

export const adCreatives = pgTable("ad_creatives", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => adCampaigns.id, { onDelete: "cascade" }),
  type: creativeTypeEnum("type").notNull().default("text"),
  title: varchar("title", { length: 60 }).notNull(),
  body: varchar("body", { length: 120 }).notNull().default(""),
  cta: varchar("cta", { length: 24 }).notNull().default("Batafsil"),
  url: text("url").notNull(),
  imageDesktop: text("image_desktop"),
  imageMobile: text("image_mobile"),
  video: text("video"),
  /** Ko'rinish: default | marketing | production (production kartochkasi — "Rasmiy jamoa") */
  style: varchar("style", { length: 16 }).notNull().default("default"),
  /** Sarlavha ustidagi urg'u, masalan "Kafolatlangan natija" */
  badge: varchar("badge", { length: 40 }),
  isActive: boolean("is_active").notNull().default(true),
});

export const adEvents = pgTable("ad_events", {
  id: serial("id").primaryKey(),
  creativeId: integer("creative_id").notNull().references(() => adCreatives.id, { onDelete: "cascade" }),
  slot: varchar("slot", { length: 8 }).notNull(),
  type: adEventEnum("type").notNull(),
  page: varchar("page", { length: 200 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("ad_events_idx").on(t.creativeId, t.createdAt)]);

export const settings = pgTable("settings", {
  key: varchar("key", { length: 60 }).primaryKey(),
  value: jsonb("value").notNull(),
}, (t) => [uniqueIndex("settings_key_idx").on(t.key)]);

export type Profile = typeof profiles.$inferSelect;
export type Profession = typeof professions.$inferSelect;
export type District = typeof districts.$inferSelect;
