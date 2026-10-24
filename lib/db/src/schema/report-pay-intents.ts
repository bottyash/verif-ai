import { createInsertSchema } from "drizzle-zod";
import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { ideasTable } from "./ideas";

export type PayIntentResponse = "yes" | "maybe" | "no" | "skip";

export const reportPayIntentsTable = pgTable(
  "verifai_report_pay_intents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    ideaId: uuid("idea_id").notNull().references(() => ideasTable.id, { onDelete: "cascade" }),
    response: text("response").$type<PayIntentResponse>().notNull(),
    testedPriceInr: integer("tested_price_inr").notNull().default(20),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("verifai_pay_intents_owner_idea_unique").on(table.ownerId, table.ideaId),
    index("verifai_pay_intents_response_created_idx").on(table.response, table.createdAt),
  ],
);

export const insertReportPayIntentSchema = createInsertSchema(reportPayIntentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertReportPayIntent = z.infer<typeof insertReportPayIntentSchema>;
export type ReportPayIntent = typeof reportPayIntentsTable.$inferSelect;
