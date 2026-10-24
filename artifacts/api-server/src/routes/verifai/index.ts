import { randomUUID } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import {
  CreateVerifaiIdeaBody,
  CreateVerifaiIdeaResponse,
  CreateVerifaiPaymentResponse,
  DemoUnlockVerifaiReportResponse,
  GetVerifaiCheckoutStatusResponse,
  GenerateVerifaiQuestionsParams,
  GenerateVerifaiQuestionsResponse,
  GetVerifaiDashboardResponse,
  GetVerifaiIdeaParams,
  GetVerifaiIdeaResponse,
  GetVerifaiMessagesResponse,
  GetVerifaiPaymentStatusResponse,
  GetVerifaiReportParams,
  GetVerifaiReportResponse,
  ListVerifaiIdeasResponse,
  RunVerifaiAnalysisParams,
  RunVerifaiAnalysisResponse,
  SaveVerifaiAnswersBody,
  SaveVerifaiAnswersParams,
  SaveVerifaiAnswersResponse,
  SendVerifaiMessageBody,
  SendVerifaiMessageParams,
  SendVerifaiMessageResponse,
} from "@workspace/api-zod";
import {
  conversations,
  db,
  ideasTable,
  messages,
  verifaiPaymentsTable,
  validationReportsTable,
  type IdeaRecord,
} from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, type AuthenticatedRequest } from "../../middlewares/requireAuth";
import { analyzeStartupIdea, ideaContext } from "../../lib/verifai-analysis";
import {
  getPineLabsClient,
  isPineLabsConfigured,
  PineLabsNotConfiguredError,
} from "../../lib/pinelabs";

const router: IRouter = Router();
router.use("/verifai", requireAuth);

const tierContent = [
  {
    tier: 1 as const,
    title: "Must know",
    description: "Four essentials for a useful first assessment.",
    questions: [
      {
        id: "customer",
        tier: 1 as const,
        prompt: "Who feels this problem most often? Describe one specific person or business.",
        rationale: "A precise first customer makes the idea testable.",
        required: true,
      },
      {
        id: "workaround",
        tier: 1 as const,
        prompt: "How do they handle it today, and what is frustrating about that?",
        rationale: "Existing behavior is stronger evidence than a hypothetical feature request.",
        required: true,
      },
      {
        id: "evidence",
        tier: 1 as const,
        prompt: "What have you observed or heard that shows this problem is real?",
        rationale: "Separate direct evidence from assumptions before scoring demand.",
        required: true,
      },
      {
        id: "first_outcome",
        tier: 1 as const,
        prompt: "What is the smallest useful result your first version could deliver?",
        rationale: "A narrow first outcome keeps the idea buildable.",
        required: true,
      },
    ],
  },
  {
    tier: 2 as const,
    title: "Better to know",
    description: "Useful detail for a more confident business assessment.",
    questions: [
      {
        id: "payer",
        tier: 2 as const,
        prompt: "Who would pay, and what do they spend or lose today?",
        rationale: "The user and the buyer may be different people.",
        required: false,
      },
      {
        id: "alternatives",
        tier: 2 as const,
        prompt: "What products, services, or workarounds already compete for this job?",
        rationale: "The status quo is a competitor too.",
        required: false,
      },
      {
        id: "first_channel",
        tier: 2 as const,
        prompt: "How could you reach your first ten target customers in India?",
        rationale: "A practical first channel makes go-to-market less speculative.",
        required: false,
      },
      {
        id: "starting_segment",
        tier: 2 as const,
        prompt: "Which city, region, or narrow customer group would you start with?",
        rationale: "A focused starting segment is easier to validate than a broad market.",
        required: false,
      },
    ],
  },
  {
    tier: 3 as const,
    title: "Great to know",
    description: "Optional detail that sharpens feasibility and risk analysis.",
    questions: [
      {
        id: "traction",
        tier: 3 as const,
        prompt: "Have you tested this with anyone? Share what they did, not only what they said.",
        rationale: "Observed actions are more informative than compliments.",
        required: false,
      },
      {
        id: "technical_dependency",
        tier: 3 as const,
        prompt: "What is the biggest technical dependency or capability you are unsure about?",
        rationale: "This helps distinguish a hard technical risk from a manageable build task.",
        required: false,
      },
      {
        id: "compliance",
        tier: 3 as const,
        prompt: "Will you handle payments, personal data, health, finance, or another regulated activity?",
        rationale: "Early flags help identify questions for qualified Indian counsel.",
        required: false,
      },
      {
        id: "riskiest_assumption",
        tier: 3 as const,
        prompt: "What one assumption would make you stop or change direction if it proved false?",
        rationale: "Testing the riskiest assumption can save the most time.",
        required: false,
      },
    ],
  },
];

function ownerIdOf(req: AuthenticatedRequest): string {
  if (!req.userId) throw new Error("Missing authenticated user context.");
  return req.userId;
}

function ideaParams(req: AuthenticatedRequest) {
  return GetVerifaiIdeaParams.safeParse(req.params);
}

async function findIdea(id: string, ownerId: string): Promise<IdeaRecord | undefined> {
  const [idea] = await db
    .select()
    .from(ideasTable)
    .where(and(eq(ideasTable.id, id), eq(ideasTable.ownerId, ownerId)))
    .limit(1);
  return idea;
}

function publicReport(report: typeof validationReportsTable.$inferSelect) {
  const full = report.isFullReport;
  return {
    id: report.id,
    ideaId: report.ideaId,
    ideaName: "",
    score: report.score,
    verdict: report.verdict,
    summary: report.summary,
    sections: report.sections.map((section) => ({
      ...section,
      summary: full ? section.summary : "",
      strengths: full ? section.strengths : [],
      improvements: full ? section.improvements : [],
      evidence: full ? section.evidence : [],
    })),
    comparisons: full ? report.comparisons : [],
    nextSteps: full ? report.nextSteps : [],
    generatedAt: report.generatedAt,
    isFullReport: full,
  };
}

const paymentParamsSchema = z.object({
  ideaId: z.string().uuid(),
  paymentId: z.string().uuid(),
});

function reportReturnUrl(req: AuthenticatedRequest, ideaId: string, paymentId: string): string {
  const protocol = req.get("x-forwarded-proto")?.split(",")[0]?.trim() || req.protocol;
  const host = req.get("x-forwarded-host")?.split(",")[0]?.trim() || req.get("host");
  if (!host) throw new Error("Could not determine the payment return host.");
  const origin = `${protocol}://${host}`;
  let basePath = "";
  const referer = req.get("referer");
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.host.toLowerCase() === host.toLowerCase()) {
        const match = refererUrl.pathname.match(/^(.*)\/ideas\/[^/]+\/(?:questions|report|chat)\/?$/);
        if (match) basePath = match[1].replace(/\/$/, "");
      }
    } catch {
      // Use the same-origin app root when a client omits or malforms Referer.
    }
  }
  const url = new URL(`${basePath}/ideas/${ideaId}/report`, origin);
  url.searchParams.set("payment", paymentId);
  return url.toString();
}

function paymentStatusFromProvider(providerStatus?: string): "CREATED" | "PENDING" | "PAID" | "FAILED" | "CANCELLED" {
  if (providerStatus === "PROCESSED") return "PAID";
  if (providerStatus === "FAILED") return "FAILED";
  if (providerStatus === "CANCELLED") return "CANCELLED";
  if (providerStatus === "CREATED") return "CREATED";
  return "PENDING";
}

function isVerifiedPaidOrder(
  order: Awaited<ReturnType<Awaited<ReturnType<typeof getPineLabsClient>>["orders"]["getOrderByMerchantReference"]>>,
  reference: string,
): boolean {
  const data = order.data;
  if (
    !data ||
    data.merchant_order_reference !== reference ||
    data.order_amount?.value !== 2000 ||
    data.order_amount?.currency !== "INR"
  ) {
    return false;
  }
  return data.status === "PROCESSED" ||
    data.payments?.some((payment) =>
      payment.status === "PROCESSED" &&
      payment.payment_amount?.value === 2000 &&
      payment.payment_amount.currency === "INR",
    ) === true;
}

router.get("/verifai/dashboard", async (req, res): Promise<void> => {
  const ownerId = ownerIdOf(req as AuthenticatedRequest);
  const allIdeas = await db
    .select({ id: ideasTable.id })
    .from(ideasTable)
    .where(eq(ideasTable.ownerId, ownerId));
  const ideas = await db
    .select()
    .from(ideasTable)
    .where(eq(ideasTable.ownerId, ownerId))
    .orderBy(desc(ideasTable.updatedAt))
    .limit(5);
  const reportScores = await db
    .select({ score: validationReportsTable.score })
    .from(validationReportsTable)
    .where(eq(validationReportsTable.ownerId, ownerId));
  const averageScore =
    reportScores.length === 0
      ? null
      : Math.round(
          reportScores.reduce((sum, report) => sum + report.score, 0) /
            reportScores.length,
        );

  res.json(
    GetVerifaiDashboardResponse.parse({
      ideasCount: allIdeas.length,
      reportsCount: reportScores.length,
      averageScore,
      recentIdeas: ideas,
    }),
  );
});

router.get("/verifai/ideas", async (req, res): Promise<void> => {
  const ownerId = ownerIdOf(req as AuthenticatedRequest);
  const ideas = await db
    .select()
    .from(ideasTable)
    .where(eq(ideasTable.ownerId, ownerId))
    .orderBy(desc(ideasTable.updatedAt));
  res.json(ListVerifaiIdeasResponse.parse(ideas));
});

router.post("/verifai/ideas", async (req, res): Promise<void> => {
  const input = CreateVerifaiIdeaBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: input.error.message });
    return;
  }
  const ownerId = ownerIdOf(req as AuthenticatedRequest);
  const [idea] = await db
    .insert(ideasTable)
    .values({
      ...input.data,
      ownerId,
      stage: "draft",
      progress: 0,
    })
    .returning();
  res.status(201).json(CreateVerifaiIdeaResponse.parse(idea));
});

router.get("/verifai/ideas/:ideaId", async (req, res): Promise<void> => {
  const parsed = ideaParams(req as AuthenticatedRequest);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const idea = await findIdea(parsed.data.ideaId, ownerIdOf(req as AuthenticatedRequest));
  if (!idea) {
    res.status(404).json({ error: "Idea not found." });
    return;
  }
  res.json(GetVerifaiIdeaResponse.parse(idea));
});

router.post("/verifai/ideas/:ideaId/questions", async (req, res): Promise<void> => {
  const parsed = GenerateVerifaiQuestionsParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const ownerId = ownerIdOf(req as AuthenticatedRequest);
  const idea = await findIdea(parsed.data.ideaId, ownerId);
  if (!idea) {
    res.status(404).json({ error: "Idea not found." });
    return;
  }

  const tiers = tierContent.map((tier) => ({
    ...tier,
    questions: tier.questions.map((question) => ({
      ...question,
      answer: idea.answers[question.id] ?? null,
    })),
  }));
  const totalCount = tiers.reduce((count, tier) => count + tier.questions.length, 0);
  const answeredCount = Object.values(idea.answers).filter((answer) => answer.trim()).length;
  await db
    .update(ideasTable)
    .set({ questionSet: { tiers }, stage: "questions", progress: Math.max(idea.progress, 10) })
    .where(and(eq(ideasTable.id, idea.id), eq(ideasTable.ownerId, ownerId)));

  res.json(
    GenerateVerifaiQuestionsResponse.parse({
      ideaId: idea.id,
      tiers,
      answeredCount,
      totalCount,
    }),
  );
});

router.put("/verifai/ideas/:ideaId/answers", async (req, res): Promise<void> => {
  const params = SaveVerifaiAnswersParams.safeParse(req.params);
  const body = SaveVerifaiAnswersBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const ownerId = ownerIdOf(req as AuthenticatedRequest);
  const idea = await findIdea(params.data.ideaId, ownerId);
  if (!idea) {
    res.status(404).json({ error: "Idea not found." });
    return;
  }
  if (!idea.questionSet) {
    res.status(409).json({ error: "Generate the refinement questions before saving answers." });
    return;
  }

  const answers = { ...idea.answers };
  for (const answer of body.data.answers) {
    if (idea.questionSet.tiers.some((tier) => tier.questions.some((question) => question.id === answer.questionId))) {
      const clean = answer.answer.trim();
      if (clean) answers[answer.questionId] = clean;
      else delete answers[answer.questionId];
    }
  }
  const totalCount = idea.questionSet.tiers.reduce((count, tier) => count + tier.questions.length, 0);
  const answeredCount = Object.values(answers).filter((answer) => answer.trim()).length;
  const requiredCount = idea.questionSet.tiers
    .flatMap((tier) => tier.questions)
    .filter((question) => question.required).length;
  const requiredAnswered = idea.questionSet.tiers
    .flatMap((tier) => tier.questions)
    .filter((question) => question.required && answers[question.id]?.trim()).length;
  const progress = Math.min(90, 10 + Math.round((answeredCount / totalCount) * 80));
  const [updated] = await db
    .update(ideasTable)
    .set({ answers, progress, stage: "questions" })
    .where(and(eq(ideasTable.id, idea.id), eq(ideasTable.ownerId, ownerId)))
    .returning();

  res.json(
    SaveVerifaiAnswersResponse.parse({
      ...updated,
      progress: requiredAnswered === requiredCount ? Math.max(80, progress) : progress,
    }),
  );
});

router.post("/verifai/ideas/:ideaId/analysis", async (req, res): Promise<void> => {
  const params = RunVerifaiAnalysisParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const ownerId = ownerIdOf(req as AuthenticatedRequest);
  const idea = await findIdea(params.data.ideaId, ownerId);
  if (!idea) {
    res.status(404).json({ error: "Idea not found." });
    return;
  }
  const requiredQuestions = idea.questionSet?.tiers
    .flatMap((tier) => tier.questions)
    .filter((question) => question.required) ?? [];
  const requiredAnswered = requiredQuestions.filter((question) => idea.answers[question.id]?.trim()).length;
  if (requiredQuestions.length === 0 || requiredAnswered < requiredQuestions.length) {
    res.status(422).json({ error: "Answer the four must-know questions before starting the assessment." });
    return;
  }

  await db
    .update(ideasTable)
    .set({ stage: "analyzing", progress: 92 })
    .where(and(eq(ideasTable.id, idea.id), eq(ideasTable.ownerId, ownerId)));

  let analysis: Awaited<ReturnType<typeof analyzeStartupIdea>>;
  try {
    analysis = await analyzeStartupIdea(idea);
  } catch (error) {
    req.log.error({ err: error, ideaId: idea.id }, "VerifAI analysis failed");
    await db
      .update(ideasTable)
      .set({ stage: "questions", progress: 90 })
      .where(and(eq(ideasTable.id, idea.id), eq(ideasTable.ownerId, ownerId)));
    res.status(502).json({ error: "The assessment could not be completed. Your saved answers are unchanged; please retry." });
    return;
  }
  const [report] = await db
    .insert(validationReportsTable)
    .values({
      ideaId: idea.id,
      ownerId,
      score: analysis.score,
      verdict: analysis.verdict,
      summary: analysis.summary,
      sections: analysis.sections,
      comparisons: analysis.comparisons,
      nextSteps: analysis.nextSteps,
      isFullReport: Boolean(idea.premiumUnlockedAt),
    })
    .returning();
  await db
    .update(ideasTable)
    .set({ stage: "report_ready", progress: 100, readinessScore: analysis.score })
    .where(and(eq(ideasTable.id, idea.id), eq(ideasTable.ownerId, ownerId)));

  res.json(
    RunVerifaiAnalysisResponse.parse({
      ...publicReport(report),
      ideaName: idea.name,
    }),
  );
});

router.get("/verifai/ideas/:ideaId/report", async (req, res): Promise<void> => {
  const params = GetVerifaiReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const ownerId = ownerIdOf(req as AuthenticatedRequest);
  const idea = await findIdea(params.data.ideaId, ownerId);
  if (!idea) {
    res.status(404).json({ error: "Idea not found." });
    return;
  }
  const [report] = await db
    .select()
    .from(validationReportsTable)
    .where(and(eq(validationReportsTable.ideaId, idea.id), eq(validationReportsTable.ownerId, ownerId)))
    .orderBy(desc(validationReportsTable.generatedAt))
    .limit(1);
  if (!report) {
    res.status(404).json({ error: "Run the idea assessment to create a report." });
    return;
  }
  res.json(GetVerifaiReportResponse.parse({ ...publicReport(report), ideaName: idea.name }));
});

router.get("/verifai/ideas/:ideaId/checkout-status", async (req, res): Promise<void> => {
  const params = GetVerifaiIdeaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const idea = await findIdea(params.data.ideaId, ownerIdOf(req as AuthenticatedRequest));
  if (!idea) {
    res.status(404).json({ error: "Idea not found." });
    return;
  }
  res.json(
    GetVerifaiCheckoutStatusResponse.parse({
      provider: "pinelabs",
      configured: process.env.VERIFAI_PAYMENT_GATEWAY_ENABLED === "true" && isPineLabsConfigured(),
      amount: 20,
      currency: "INR",
      unlocked: Boolean(idea.premiumUnlockedAt),
    }),
  );
});

router.post("/verifai/ideas/:ideaId/demo-unlock", async (req, res): Promise<void> => {
  if (process.env.NODE_ENV !== "development") {
    res.status(403).json({ error: "Demo unlock is available in development only." });
    return;
  }
  const params = GetVerifaiIdeaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const ownerId = ownerIdOf(req as AuthenticatedRequest);
  const idea = await findIdea(params.data.ideaId, ownerId);
  if (!idea) {
    res.status(404).json({ error: "Idea not found." });
    return;
  }
  const [report] = await db
    .select({ id: validationReportsTable.id })
    .from(validationReportsTable)
    .where(and(eq(validationReportsTable.ideaId, idea.id), eq(validationReportsTable.ownerId, ownerId)))
    .orderBy(desc(validationReportsTable.generatedAt))
    .limit(1);
  if (!report) {
    res.status(409).json({ error: "Generate a report before using the demo unlock." });
    return;
  }
  await db.transaction(async (tx) => {
    await tx
      .update(ideasTable)
      .set({ premiumUnlockedAt: idea.premiumUnlockedAt ?? new Date() })
      .where(and(eq(ideasTable.id, idea.id), eq(ideasTable.ownerId, ownerId)));
    await tx
      .update(validationReportsTable)
      .set({ isFullReport: true })
      .where(and(eq(validationReportsTable.ideaId, idea.id), eq(validationReportsTable.ownerId, ownerId)));
  });
  res.json(
    DemoUnlockVerifaiReportResponse.parse({
      ideaId: idea.id,
      unlocked: true,
      demo: true,
    }),
  );
});

router.post("/verifai/ideas/:ideaId/payments", async (req, res): Promise<void> => {
  const params = GetVerifaiIdeaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (process.env.VERIFAI_PAYMENT_GATEWAY_ENABLED !== "true") {
    res.status(503).json({ error: "Real payment checkout is disabled in this prototype. Use the demo unlock." });
    return;
  }
  const ownerId = ownerIdOf(req as AuthenticatedRequest);
  const idea = await findIdea(params.data.ideaId, ownerId);
  if (!idea) {
    res.status(404).json({ error: "Idea not found." });
    return;
  }
  if (idea.premiumUnlockedAt) {
    res.status(409).json({ error: "This idea's full report is already unlocked." });
    return;
  }
  const [report] = await db
    .select({ id: validationReportsTable.id })
    .from(validationReportsTable)
    .where(and(eq(validationReportsTable.ideaId, idea.id), eq(validationReportsTable.ownerId, ownerId)))
    .orderBy(desc(validationReportsTable.generatedAt))
    .limit(1);
  if (!report) {
    res.status(409).json({ error: "Generate the free snapshot before starting checkout." });
    return;
  }
  if (!isPineLabsConfigured()) {
    res.status(503).json({ error: "Pine Labs UAT credentials have not been connected." });
    return;
  }

  const [pendingPayment] = await db
    .select()
    .from(verifaiPaymentsTable)
    .where(
      and(
        eq(verifaiPaymentsTable.ideaId, idea.id),
        eq(verifaiPaymentsTable.ownerId, ownerId),
        eq(verifaiPaymentsTable.status, "CREATED"),
      ),
    )
    .orderBy(desc(verifaiPaymentsTable.createdAt))
    .limit(1);
  if (
    pendingPayment?.checkoutUrl &&
    Date.now() - pendingPayment.createdAt.getTime() < 15 * 60 * 1000
  ) {
    res.status(201).json(
      CreateVerifaiPaymentResponse.parse({
        paymentId: pendingPayment.id,
        checkoutUrl: pendingPayment.checkoutUrl,
        status: pendingPayment.status,
        amount: 20,
        currency: "INR",
      }),
    );
    return;
  }

  const merchantOrderReference = `VERIFAI-${randomUUID()}`;
  const [payment] = await db
    .insert(verifaiPaymentsTable)
    .values({
      ideaId: idea.id,
      ownerId,
      merchantOrderReference,
      checkoutUrl: "",
      amountPaise: 2000,
      currency: "INR",
      status: "CREATED",
    })
    .returning();
  try {
    const pineLabs = await getPineLabsClient();
    const callbackUrl = reportReturnUrl(req as AuthenticatedRequest, idea.id, payment.id);
    const order = await pineLabs.orders.createOrder({
      merchant_order_reference: merchantOrderReference,
      order_amount: { value: payment.amountPaise, currency: "INR" },
      callback_url: callbackUrl,
      failure_callback_url: callbackUrl,
      notes: "VerifAI full validation report and founder chat unlock",
    });
    const data = order.data;
    if (
      !data?.order_id ||
      !data.challenge_url ||
      data.merchant_order_reference !== merchantOrderReference ||
      data.order_amount?.value !== 2000 ||
      data.order_amount?.currency !== "INR"
    ) {
      throw new Error("Pine Labs returned an incomplete or mismatched order.");
    }
    await db
      .update(verifaiPaymentsTable)
      .set({
        providerOrderId: data.order_id,
        checkoutUrl: data.challenge_url,
        status: data.status ?? "CREATED",
      })
      .where(eq(verifaiPaymentsTable.id, payment.id));
    res.status(201).json(
      CreateVerifaiPaymentResponse.parse({
        paymentId: payment.id,
        checkoutUrl: data.challenge_url,
        status: data.status ?? "CREATED",
        amount: 20,
        currency: "INR",
      }),
    );
  } catch (error) {
    req.log.error({ err: error, paymentId: payment.id }, "Pine Labs checkout creation failed");
    await db
      .update(verifaiPaymentsTable)
      .set({ status: "FAILED" })
      .where(eq(verifaiPaymentsTable.id, payment.id));
    if (error instanceof PineLabsNotConfiguredError) {
      res.status(503).json({ error: "Pine Labs UAT credentials have not been connected." });
      return;
    }
    res.status(502).json({ error: "Pine Labs could not create a checkout session. No payment was taken." });
  }
});

router.get("/verifai/ideas/:ideaId/payments/:paymentId", async (req, res): Promise<void> => {
  const params = paymentParamsSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const ownerId = ownerIdOf(req as AuthenticatedRequest);
  const idea = await findIdea(params.data.ideaId, ownerId);
  if (!idea) {
    res.status(404).json({ error: "Idea not found." });
    return;
  }
  const [payment] = await db
    .select()
    .from(verifaiPaymentsTable)
    .where(
      and(
        eq(verifaiPaymentsTable.id, params.data.paymentId),
        eq(verifaiPaymentsTable.ideaId, idea.id),
        eq(verifaiPaymentsTable.ownerId, ownerId),
      ),
    )
    .limit(1);
  if (!payment) {
    res.status(404).json({ error: "Payment not found." });
    return;
  }
  if (idea.premiumUnlockedAt || payment.status === "PAID") {
    res.json(
      GetVerifaiPaymentStatusResponse.parse({
        paymentId: payment.id,
        status: "PAID",
        unlocked: true,
      }),
    );
    return;
  }
  if (payment.status === "FAILED" || payment.status === "CANCELLED") {
    res.json(
      GetVerifaiPaymentStatusResponse.parse({
        paymentId: payment.id,
        status: payment.status,
        unlocked: false,
      }),
    );
    return;
  }
  if (!isPineLabsConfigured()) {
    res.status(503).json({ error: "Pine Labs UAT credentials have not been connected." });
    return;
  }

  try {
    const pineLabs = await getPineLabsClient();
    const order = await pineLabs.orders.getOrderByMerchantReference({
      merchant_order_reference: payment.merchantOrderReference,
    });
    const verified = isVerifiedPaidOrder(order, payment.merchantOrderReference);
    const status = verified ? "PAID" : paymentStatusFromProvider(order.data?.status);
    if (verified) {
      await db.transaction(async (tx) => {
        await tx
          .update(verifaiPaymentsTable)
          .set({ status: "PAID", providerOrderId: order.data?.order_id ?? payment.providerOrderId, paidAt: new Date() })
          .where(eq(verifaiPaymentsTable.id, payment.id));
        await tx
          .update(ideasTable)
          .set({ premiumUnlockedAt: new Date() })
          .where(and(eq(ideasTable.id, idea.id), eq(ideasTable.ownerId, ownerId)));
        await tx
          .update(validationReportsTable)
          .set({ isFullReport: true })
          .where(and(eq(validationReportsTable.ideaId, idea.id), eq(validationReportsTable.ownerId, ownerId)));
      });
    } else {
      await db
        .update(verifaiPaymentsTable)
        .set({ status, providerOrderId: order.data?.order_id ?? payment.providerOrderId })
        .where(eq(verifaiPaymentsTable.id, payment.id));
    }
    res.json(
      GetVerifaiPaymentStatusResponse.parse({
        paymentId: payment.id,
        status,
        unlocked: verified,
      }),
    );
  } catch (error) {
    req.log.error({ err: error, paymentId: payment.id }, "Pine Labs payment verification failed");
    res.status(502).json({ error: "Payment status could not be verified with Pine Labs. Please retry shortly." });
  }
});

router.get("/verifai/ideas/:ideaId/messages", async (req, res): Promise<void> => {
  const params = GetVerifaiIdeaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const ownerId = ownerIdOf(req as AuthenticatedRequest);
  const idea = await findIdea(params.data.ideaId, ownerId);
  if (!idea) {
    res.status(404).json({ error: "Idea not found." });
    return;
  }
  if (!idea.premiumUnlockedAt) {
    res.status(402).json({ error: "Unlock the full report to use idea refinement chat." });
    return;
  }
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.ideaId, idea.id), eq(conversations.ownerId, ownerId)))
    .limit(1);
  const history = conversation
    ? await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(asc(messages.createdAt))
      : [];
  res.json(
    GetVerifaiMessagesResponse.parse({
      messages: history.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      })),
    }),
  );
});

router.post("/verifai/ideas/:ideaId/messages", async (req, res): Promise<void> => {
  const params = SendVerifaiMessageParams.safeParse(req.params);
  const body = SendVerifaiMessageBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const ownerId = ownerIdOf(req as AuthenticatedRequest);
  const idea = await findIdea(params.data.ideaId, ownerId);
  if (!idea) {
    res.status(404).json({ error: "Idea not found." });
    return;
  }
  const [report] = await db
    .select()
    .from(validationReportsTable)
    .where(and(eq(validationReportsTable.ideaId, idea.id), eq(validationReportsTable.ownerId, ownerId)))
    .orderBy(desc(validationReportsTable.generatedAt))
    .limit(1);
  if (!report || !idea.premiumUnlockedAt) {
    res.status(402).json({ error: "Unlock the full report to use idea refinement chat." });
    return;
  }

  let [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.ideaId, idea.id), eq(conversations.ownerId, ownerId)))
    .limit(1);
  if (!conversation) {
    [conversation] = await db
      .insert(conversations)
      .values({ ownerId, ideaId: idea.id, title: idea.name })
      .returning();
  }
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversation.id))
    .orderBy(desc(messages.createdAt))
    .limit(12);
  const response = await openai.chat.completions.create({
    model: "gpt-5.6-luna",
    max_completion_tokens: 8192,
    messages: [
      {
        role: "system",
        content:
          "You are VerifAI's practical startup coach. Help refine the founder's idea using the report and their evidence. Ask focused questions when essential information is missing. Do not invent market research, customers, regulations, financial projections, or evidence. For legal or investment decisions, recommend qualified professional review. Do not claim certainty from a directional AI assessment.",
      },
      {
        role: "user",
        content: `Idea:\n${ideaContext(idea)}\n\nFull report:\n${JSON.stringify(report.sections)}\n\nCurrent verdict: ${report.verdict}\n${report.summary}`,
      },
      ...history.reverse().map((item) => ({
        role: item.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: item.content,
      })),
      { role: "user", content: body.data.message },
    ],
  });
  const reply = response.choices[0]?.message?.content?.trim();
  if (!reply) {
    res.status(502).json({ error: "The refinement assistant did not return a response. Please try again." });
    return;
  }
  await db.insert(messages).values([
    { conversationId: conversation.id, role: "user", content: body.data.message },
    { conversationId: conversation.id, role: "assistant", content: reply },
  ]);
  res.json(
    SendVerifaiMessageResponse.parse({
      reply,
      suggestedPrompts: [
        "Help me test the riskiest assumption",
        "Narrow this to a first customer segment",
        "Turn the next step into a 2-week experiment",
      ],
    }),
  );
});

export default router;
