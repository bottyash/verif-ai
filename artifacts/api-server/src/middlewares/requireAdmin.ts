import { clerkClient, getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Sign in to continue." });
    return;
  }

  const allowedEmails = new Set(
    (process.env.VERIFAI_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
  if (allowedEmails.size === 0) {
    req.log.warn("Admin access requested before an admin email was configured");
    res.status(503).json({ error: "Administrator access is not configured." });
    return;
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const isAdmin = user.emailAddresses.some((email) =>
      email.verification?.status === "verified"
      && allowedEmails.has(email.emailAddress.trim().toLowerCase()),
    );
    if (!isAdmin) {
      res.status(403).json({ error: "Administrator access required." });
      return;
    }
    next();
  } catch (error) {
    req.log.error({ err: error, userId }, "Could not verify VerifAI administrator");
    res.status(503).json({ error: "Administrator access could not be verified." });
  }
}
