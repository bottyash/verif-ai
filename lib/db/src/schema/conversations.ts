import { createInsertSchema } from "drizzle-zod";
import { index, pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { ideasTable } from "./ideas";

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  ideaId: uuid("idea_id").notNull().references(() => ideasTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("verifai_conversations_owner_idea_idx").on(table.ownerId, table.ideaId)]);

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
