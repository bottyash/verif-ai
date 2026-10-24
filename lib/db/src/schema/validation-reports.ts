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

export type ReportHeadlineSnapshot = {
  market: {
    tam: string | null;
    sam: string | null;
    som: string | null;
    cagr: string | null;
    stage: "emerging" | "growing" | "saturated" | "unknown";
  };
  audience: {
    primarySegment: string | null;
    ageGroup: string | null;
    estimatedReachableUsers: string | null;
    topRegion: string | null;
  };
  financialSignals: {
    startupCostRange: string | null;
    breakEvenTimeline: string | null;
    roiRating: "low" | "medium" | "high" | null;
  };
  quickRatings: {
    technicalFeasibility: number;
    competitionPressure: number;
    legalComplexity: number;
    goToMarketDifficulty: number;
  };
  teasers: {
    criticalRiskCount: number;
    competitorReviewCount: number;
    legalReviewCount: number;
    fundingReadinessAvailable: boolean;
  };
};

export type StoredRiskItem = {
  risk: string;
  likelihood: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  mitigation: string;
};

export type ReportVisuals = {
  marketSplit: Array<{ label: string; value: number }>;
  marketSizing: {
    unit: string;
    tam: number | null;
    sam: number | null;
    som: number | null;
    assumption: string;
  } | null;
  competitorPositioning: Array<{ label: string; value: number; isThisIdea: boolean }>;
  revenueScenarios: Array<{ label: string; year1: number; year2: number; year3: number }>;
  revenueUnit: string;
  milestones: Array<{ when: string; title: string }>;
  assumptionNote: string;
};

export type PaidReportDetails = {
  scoreBreakdown: Array<{
    key: StoredReportSection["key"];
    title: string;
    score: number;
    weightPercent: number;
  }>;
  marketAnalysis: string[];
  customerAnalysis: string[];
  competitorAnalysis: string[];
  financialModel: string[];
  technicalPlan: string[];
  goToMarket: string[];
  riskRegister: StoredRiskItem[];
  legalCompliance: string[];
  fundingReadiness: {
    score: number;
    investorFit: string[];
    relevantPrograms: string[];
    pitchGaps: string[];
    valuationRange: string | null;
    likelyQuestions: string[];
  };
  actionPlan: {
    thisWeek: string[];
    thisMonth: string[];
    thisQuarter: string[];
    validationExperiments: string[];
  };
  visuals?: ReportVisuals | null;
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
    headlineSnapshot: jsonb("headline_snapshot").$type<ReportHeadlineSnapshot | null>(),
    paidDetails: jsonb("paid_details").$type<PaidReportDetails | null>(),
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
