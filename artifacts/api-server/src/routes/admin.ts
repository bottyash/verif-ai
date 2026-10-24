import { count, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetVerifaiAdminOverviewResponse,
  GetVerifaiAdminReportParams,
  GetVerifaiAdminReportResponse,
  GetVerifaiAdminReportsQueryParams,
  GetVerifaiAdminReportsResponse,
} from "@workspace/api-zod";
import {
  db,
  ideasTable,
  reportUnlockEventsTable,
  validationReportsTable,
} from "@workspace/db";
import { clerkClient } from "@clerk/express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

router.use("/verifai/admin", requireAuth, requireAdmin);

router.get("/verifai/admin/overview", async (_req, res): Promise<void> => {
  const [users, [reportTotals], [freeReportTotals], [unlockClicks], [unlockCompletions]] =
    await Promise.all([
      clerkClient.users.getUserList({ limit: 1 }),
      db.select({ value: count() }).from(validationReportsTable),
      db.select({ value: count() })
        .from(validationReportsTable)
        .where(eq(validationReportsTable.isFullReport, false)),
      db.select({ value: count() })
        .from(reportUnlockEventsTable)
        .where(eq(reportUnlockEventsTable.eventType, "unlock_clicked")),
      db.select({ value: count() })
        .from(reportUnlockEventsTable)
        .where(eq(reportUnlockEventsTable.eventType, "unlock_completed")),
    ]);

  const clickCount = unlockClicks.value;
  const completedCount = unlockCompletions.value;
  const unlockConversionRate = clickCount === 0
    ? 0
    : Math.round((completedCount / clickCount) * 1000) / 10;

  res.json(
    GetVerifaiAdminOverviewResponse.parse({
      userCount: users.totalCount,
      reportCount: reportTotals.value,
      freeOnlyReportCount: freeReportTotals.value,
      unlockClickCount: clickCount,
      unlockCompletedCount: completedCount,
      unlockConversionRate,
    }),
  );
});

router.get("/verifai/admin/reports", async (req, res): Promise<void> => {
  const parsed = GetVerifaiAdminReportsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const page = parsed.data.page ?? 1;
  const pageSize = parsed.data.pageSize ?? 25;
  const offset = (page - 1) * pageSize;
  const [[{ value: total }], rows] = await Promise.all([
    db.select({ value: count() }).from(validationReportsTable),
    db
      .select({
        id: validationReportsTable.id,
        ideaId: validationReportsTable.ideaId,
        ideaName: ideasTable.name,
        ownerId: validationReportsTable.ownerId,
        score: validationReportsTable.score,
        verdict: validationReportsTable.verdict,
        generatedAt: validationReportsTable.generatedAt,
        isFullReport: validationReportsTable.isFullReport,
        unlockedAt: ideasTable.premiumUnlockedAt,
      })
      .from(validationReportsTable)
      .innerJoin(ideasTable, eq(validationReportsTable.ideaId, ideasTable.id))
      .orderBy(desc(validationReportsTable.generatedAt))
      .limit(pageSize)
      .offset(offset),
  ]);

  res.json(
    GetVerifaiAdminReportsResponse.parse({
      items: rows.map((report) => ({
        ...report,
        generatedAt: report.generatedAt.toISOString(),
        unlockedAt: report.unlockedAt?.toISOString() ?? null,
      })),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    }),
  );
});

router.get("/verifai/admin/reports/:reportId", async (req, res): Promise<void> => {
  const params = GetVerifaiAdminReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [report] = await db
    .select({
      id: validationReportsTable.id,
      ideaId: validationReportsTable.ideaId,
      ideaName: ideasTable.name,
      ownerId: validationReportsTable.ownerId,
      score: validationReportsTable.score,
      verdict: validationReportsTable.verdict,
      summary: validationReportsTable.summary,
      sections: validationReportsTable.sections,
      comparisons: validationReportsTable.comparisons,
      nextSteps: validationReportsTable.nextSteps,
      generatedAt: validationReportsTable.generatedAt,
      isFullReport: validationReportsTable.isFullReport,
      unlockedAt: ideasTable.premiumUnlockedAt,
    })
    .from(validationReportsTable)
    .innerJoin(ideasTable, eq(validationReportsTable.ideaId, ideasTable.id))
    .where(eq(validationReportsTable.id, params.data.reportId))
    .limit(1);

  if (!report) {
    res.status(404).json({ error: "Report not found." });
    return;
  }

  res.json(
    GetVerifaiAdminReportResponse.parse({
      ...report,
      generatedAt: report.generatedAt.toISOString(),
      unlockedAt: report.unlockedAt?.toISOString() ?? null,
    }),
  );
});

export default router;
