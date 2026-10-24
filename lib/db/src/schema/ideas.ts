import { createInsertSchema } from "drizzle-zod";
import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export type StoredQuestion = {
  id: string;
  tier: 1 | 2 | 3;
  prompt: string;
  rationale: string;
  required: boolean;
  answer: string | null;
};

export type StoredQuestionSet = {
  tiers: {
    tier: 1 | 2 | 3;
    title: string;
    description: string;
    questions: StoredQuestion[];
  }[];
};

export const ideasTable = pgTable(
  "verifai_ideas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    problem: text("problem"),
    targetCustomer: text("target_customer"),
    targetMarket: text("target_market").notNull().default("India"),
    stage: text("stage").notNull().default("draft"),
    progress: integer("progress").notNull().default(0),
    readinessScore: integer("readiness_score"),
    questionSet: jsonb("question_set").$type<StoredQuestionSet | null>(),
    answers: jsonb("answers").$type<Record<string, string>>().notNull().default({}),
    premiumUnlockedAt: timestamp("premium_unlocked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index("verifai_ideas_owner_created_idx").on(table.ownerId, table.createdAt)],
);

export const insertIdeaSchema = createInsertSchema(ideasTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertIdea = z.infer<typeof insertIdeaSchema>;
export type IdeaRecord = typeof ideasTable.$inferSelect;
