import { createInsertSchema } from "drizzle-zod";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { ideasTable } from "./ideas";

export type ReportUnlockEventType =
  | "unlock_clicked"
  | "unlock_completed"
  | "unlock_offer_clicked"
  | "demo_unlocked"
  | "neighbors_viewed"
  | "neighbors_yc_link_clicked";

export const reportUnlockEventsTable = pgTable(
  "verifai_report_unlock_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    ideaId: uuid("idea_id").notNull().references(() => ideasTable.id, { onDelete: "cascade" }),
    eventType: text("event_type").$type<ReportUnlockEventType>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("verifai_unlock_events_type_created_idx").on(table.eventType, table.createdAt),
    index("verifai_unlock_events_owner_idea_idx").on(table.ownerId, table.ideaId),
  ],
);

export const insertReportUnlockEventSchema = createInsertSchema(reportUnlockEventsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertReportUnlockEvent = z.infer<typeof insertReportUnlockEventSchema>;
export type ReportUnlockEvent = typeof reportUnlockEventsTable.$inferSelect;
