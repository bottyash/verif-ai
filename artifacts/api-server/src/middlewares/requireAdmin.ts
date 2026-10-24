import { clerkClient, getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

function allowedAdminEmails(): Set<string> {
  return new Set(
    (process.env.VERIFAI_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** True only when the user has a verified email on the server-side admin allowlist. */
export async function isVerifiedAdmin(userId: string): Promise<boolean> {
  const allowedEmails = allowedAdminEmails();
  if (allowedEmails.size === 0) return false;
  const user = await clerkClient.users.getUser(userId);
  return user.emailAddresses.some((email) =>
    email.verification?.status === "verified"
    && allowedEmails.has(email.emailAddress.trim().toLowerCase()),
  );
}

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

  if (allowedAdminEmails().size === 0) {
    req.log.warn("Admin access requested before an admin email was configured");
    res.status(503).json({ error: "Administrator access is not configured." });
    return;
  }

  try {
    if (!(await isVerifiedAdmin(userId))) {
      res.status(403).json({ error: "Administrator access required." });
      return;
    }
    next();
  } catch (error) {
    req.log.error({ err: error, userId }, "Could not verify VerifAI administrator");
    res.status(503).json({ error: "Administrator access could not be verified." });
  }
}
