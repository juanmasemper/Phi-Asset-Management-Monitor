import { privateJson, sessionStatus } from "../authorization.mjs";
import { tables } from "../workbook-data.mjs";

export async function GET(request) {
  const status = await sessionStatus(request);
  if (status !== 200) return privateJson({ status: "sign_in_required" }, status);
  return privateJson(tables);
}
