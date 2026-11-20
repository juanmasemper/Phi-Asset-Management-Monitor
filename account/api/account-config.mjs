import { accountSettings, privateJson } from "../authorization.mjs";

export function GET(request) {
  const settings = accountSettings();
  if (!settings) return privateJson({ status: "unconfigured" }, 503);
  if (new URL(request.url).origin !== settings.origin) return privateJson({ accessUrl: settings.origin + "/" });
  return privateJson({ publishableKey: settings.publishableKey });
}
