import { accountSettings, privateJson } from "../authorization.mjs";

export function GET(request) {
  const settings = accountSettings();
  if (!settings || new URL(request.url).origin !== settings.origin) {
    return privateJson({ status: "unconfigured" }, 503);
  }
  return privateJson({ publishableKey: settings.publishableKey });
}
