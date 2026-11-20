import { Clerk } from "@clerk/clerk-js";
import { esES } from "@clerk/localizations/es-ES";
import { startAccountMonitor } from "./dist/app.js";

const root = document.documentElement;
const $ = selector => document.querySelector(selector);
const screen = $("#account-screen");
const monitor = $("main");
const status = $("#account-status");
const form = $("#account-form");
const signOut = $("#account-sign-out");

function showGreeting(user) {
  const hour = new Date().getHours();
  const greeting = hour >= 5 && hour < 12 ? "Buen día" : hour >= 12 && hour < 20 ? "Buenas tardes" : "Buenas noches";
  const name = user.firstName || user.username || user.primaryEmailAddress?.emailAddress.split("@")[0];
  $("#heading").textContent = name ? `${greeting}, ${name}` : greeting;
}

function appearance() {
  const colors = getComputedStyle(root);
  const variable = name => colors.getPropertyValue(name).trim();
  return {
    variables: {
      colorPrimary: variable("--accent"),
      colorBackground: variable("--card"),
      colorInputBackground: variable("--soft"),
      colorText: variable("--text"),
      colorTextSecondary: variable("--muted"),
      colorInputText: variable("--text"),
      borderRadius: "10px",
      fontFamily: "Segoe UI, system-ui, sans-serif",
    },
    elements: {
      rootBox: { width: "100%" },
      cardBox: { width: "100%", boxShadow: "none" },
      formButtonPrimary: { color: variable("--selected-text"), backgroundColor: variable("--selected") },
    },
  };
}

async function startAccess() {
  const response = await fetch("/api/account-config", { cache: "no-store" });
  if (!response.ok) throw new Error("Account settings unavailable");
  const { publishableKey } = await response.json();
  const frontend = atob(publishableKey.split("_")[2]).replace(/\$$/, "");
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(frontend)) throw new Error("Invalid authentication domain");
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://${frontend}/npm/@clerk/ui@1/dist/ui.browser.js`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load Clerk forms"));
    document.head.append(script);
  });
  const clerk = new Clerk(publishableKey);
  await clerk.load({ localization: esES, ui: { ClerkUI: window.__internal_ClerkUICtor } });
  signOut.addEventListener("click", async () => {
    signOut.disabled = true;
    try { await clerk.signOut({ redirectUrl: "/" }); }
    catch { signOut.disabled = false; }
  });

  async function sessionHeaders() {
    const token = await clerk.session?.getToken();
    if (!token) throw new Error("Session required");
    return { Authorization: `Bearer ${token}` };
  }

  let admittedUser;
  let checkingUser;
  let mounted;
  let revision = 0;
  function mountForm() {
    if (mounted) return;
    const signup = new URLSearchParams(location.search).get("acceso") === "registro";
    const props = {
      routing: "hash", signInUrl: "/", signUpUrl: "/?acceso=registro",
      forceRedirectUrl: "/", signInForceRedirectUrl: "/", signUpForceRedirectUrl: "/",
      appearance: appearance(),
    };
    if (signup) clerk.mountSignUp(form, props);
    else clerk.mountSignIn(form, props);
    mounted = signup ? "signup" : "signin";
  }

  async function renderAccess() {
    const user = clerk.user;
    if (user && (admittedUser === user.id || checkingUser === user.id)) return;
    const pass = ++revision;
    if (!user && admittedUser) {
      location.replace("/");
      return;
    }
    signOut.hidden = !user;
    if (!user) {
      status.textContent = "";
      mountForm();
      return;
    }
    checkingUser = user.id;
    status.textContent = "Comprobando tu acceso…";
    let failure = "";
    const loaded = await startAccountMonitor(async () => {
      const data = await fetch("/api/monitor-data", { headers: await sessionHeaders(), cache: "no-store" });
      if (!data.ok) {
        failure = data.status === 403 ? "Verificá tu correo para acceder al monitor." : "No se pudo validar tu acceso.";
        throw new Error("Monitor unavailable");
      }
      return data.json();
    }, sessionHeaders);
    if (checkingUser === user.id) checkingUser = undefined;
    if (pass !== revision) return;
    if (!loaded) {
      status.textContent = failure || "No se pudo cargar el monitor.";
      return;
    }
    admittedUser = user.id;
    showGreeting(user);
    if (mounted === "signup") clerk.unmountSignUp(form);
    if (mounted === "signin") clerk.unmountSignIn(form);
    mounted = null;
    screen.hidden = true;
    monitor.hidden = false;
  }

  clerk.addListener(() => { void renderAccess(); }, { skipInitialEmit: true });
  await renderAccess();
}

startAccess().catch(() => {
  status.textContent = "El acceso con cuenta no está disponible en este momento.";
});
