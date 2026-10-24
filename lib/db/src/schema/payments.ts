import { createInsertSchema } from "drizzle-zod";
import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { ideasTable } from "./ideas";

export const verifaiPaymentsTable = pgTable(
  "verifai_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ideaId: uuid("idea_id").notNull().references(() => ideasTable.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull(),
    merchantOrderReference: text("merchant_order_reference").notNull(),
    providerOrderId: text("provider_order_id"),
    checkoutUrl: text("checkout_url").notNull(),
    amountPaise: integer("amount_paise").notNull().default(2000),
    currency: text("currency").notNull().default("INR"),
    status: text("status").notNull().default("CREATED"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("verifai_payments_reference_uidx").on(table.merchantOrderReference),
    index("verifai_payments_owner_idea_created_idx").on(table.ownerId, table.ideaId, table.createdAt),
  ],
);

export const insertVerifaiPaymentSchema = createInsertSchema(verifaiPaymentsTable).omit({
  id: true,
  createdAt: true,
  paidAt: true,
});

export type InsertVerifaiPayment = z.infer<typeof insertVerifaiPaymentSchema>;
export type VerifaiPaymentRecord = typeof verifaiPaymentsTable.$inferSelect;
