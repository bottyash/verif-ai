import { createInsertSchema } from "drizzle-zod";
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { ideasTable } from "./ideas";

export type StoredReportSection = {
  key: "market" | "technology" | "customers" | "go_to_market" | "risks" | "legal";
  title: string;
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  evidence: string[];
};

export const validationReportsTable = pgTable(
  "verifai_validation_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ideaId: uuid("idea_id").notNull().references(() => ideasTable.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull(),
    score: integer("score").notNull(),
    verdict: text("verdict").notNull(),
    summary: text("summary").notNull(),
    sections: jsonb("sections").$type<StoredReportSection[]>().notNull(),
    comparisons: jsonb("comparisons").$type<string[]>().notNull().default([]),
    nextSteps: jsonb("next_steps").$type<string[]>().notNull().default([]),
    isFullReport: boolean("is_full_report").notNull().default(false),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("verifai_reports_owner_idea_generated_idx").on(table.ownerId, table.ideaId, table.generatedAt)],
);

export const insertValidationReportSchema = createInsertSchema(validationReportsTable).omit({
  id: true,
  generatedAt: true,
});

export type InsertValidationReport = z.infer<typeof insertValidationReportSchema>;
export type ValidationReportRecord = typeof validationReportsTable.$inferSelect;
