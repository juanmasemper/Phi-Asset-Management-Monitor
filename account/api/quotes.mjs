import { privateJson, sessionStatus } from "../authorization.mjs";
import { GET as getQuotes } from "../market-quotes.mjs";

export async function GET(request) {
  const status = await sessionStatus(request);
  if (status !== 200) return privateJson({ status: "sign_in_required" }, status);
  return getQuotes(request);
}
