import { createClerkClient } from "@clerk/backend";

export function accountSettings() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? process.env.CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;
  const origin = process.env.MONITOR_ORIGIN ?? "https://phi-monitor-acceso.vercel.app";
  return publishableKey && secretKey ? { publishableKey, secretKey, origin } : null;
}

export function privateJson(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function sessionStatus(request, makeClient = createClerkClient) {
  const settings = accountSettings();
  if (!settings) return 503;
  if (!request.headers.get("authorization")?.startsWith("Bearer ")) return 401;
  try {
    const { publishableKey, secretKey, origin } = settings;
    const client = makeClient({ publishableKey, secretKey });
    const state = await client.authenticateRequest(request, { authorizedParties: [origin], acceptsToken: "session_token" });
    const { userId } = state.toAuth() ?? {};
    if (!state.isAuthenticated || !userId) return 401;
    const user = await client.users.getUser(userId);
    return user.emailAddresses.some(email => email.verification?.status === "verified") ? 200 : 403;
  } catch {
    return 401;
  }
}
