import { PinelabsApiClient } from "pinelabs-node";

const UAT_BASE_URL = "https://pluraluat.v2.pinepg.in";
const PRODUCTION_BASE_URL = "https://api.pluralpay.in";

let cachedToken: { value: string; expiresAt: number } | undefined;
let tokenRequest: Promise<string> | undefined;

export class PineLabsNotConfiguredError extends Error {
  constructor() {
    super("Pine Labs merchant credentials are not configured.");
    this.name = "PineLabsNotConfiguredError";
  }
}

function credentials() {
  const clientId = process.env.PINELABS_CLIENT_ID;
  const clientSecret = process.env.PINELABS_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new PineLabsNotConfiguredError();
  return { clientId, clientSecret };
}

function baseUrl(): string {
  return process.env.PINELABS_ENVIRONMENT === "production"
    ? PRODUCTION_BASE_URL
    : UAT_BASE_URL;
}

async function accessToken(): Promise<string> {
  const { clientId, clientSecret } = credentials();
  if (cachedToken && Date.now() < cachedToken.expiresAt - 30_000) {
    return cachedToken.value;
  }
  if (!tokenRequest) {
    tokenRequest = (async () => {
      const authClient = new PinelabsApiClient({ baseUrl: baseUrl(), token: "" });
      const token = await authClient.authentication.generateToken({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      });
      if (!token.access_token) {
        throw new Error("Pine Labs token response did not contain an access token.");
      }
      cachedToken = {
        value: token.access_token,
        expiresAt: token.expires_at
          ? new Date(token.expires_at).getTime()
          : Date.now() + 10 * 60 * 1000,
      };
      return token.access_token;
    })();
  }
  try {
    return await tokenRequest;
  } finally {
    tokenRequest = undefined;
  }
}

export async function getPineLabsClient(): Promise<PinelabsApiClient> {
  return new PinelabsApiClient({
    baseUrl: baseUrl(),
    token: await accessToken(),
  });
}

export function isPineLabsConfigured(): boolean {
  return Boolean(process.env.PINELABS_CLIENT_ID && process.env.PINELABS_CLIENT_SECRET);
}
