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
const recover = $("#account-recover");
const continueLink = $("#account-continue");
const monitorPath = "/monitor";
const monitorRequested = location.pathname.replace(/\/$/, "") === monitorPath;

const localization = {
  ...esES,
  signIn: { ...esES.signIn, start: { ...esES.signIn.start, subtitle: "Ingresá a Phi Asset Management", actionLink: "Creá una cuenta" } },
  signUp: { ...esES.signUp, start: {
    ...esES.signUp.start, subtitle: "Registrate en Phi Asset Management", subtitleCombined: "Registrate en Phi Asset Management",
  } },
};

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
  await clerk.load({ localization, ui: { ClerkUI: window.__internal_ClerkUICtor } });
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
      forceRedirectUrl: monitorPath, signInForceRedirectUrl: monitorPath, signUpForceRedirectUrl: monitorPath,
      appearance: appearance(),
    };
    if (signup) clerk.mountSignUp(form, props);
    else clerk.mountSignIn(form, props);
    mounted = signup ? "signup" : "signin";
    recover.hidden = signup;
  }

  recover.addEventListener("click", () => {
    if (mounted === "signin") clerk.unmountSignIn(form);
    mounted = "recovery";
    recover.hidden = true;
    const recovery = $("#account-recovery");
    const feedback = $("#recovery-status");
    const next = $("#recovery-next");
    const email = $("#recovery-email");
    const code = $("#recovery-code");
    const password = $("#recovery-password");
    const stages = [
      {
        fields: [email], label: "Enviar código", run: () => clerk.client.signIn.create({
          identifier: email.value.trim(), strategy: "reset_password_email_code",
        }),
      },
      {
        fields: [code, password], label: "Guardar contraseña", run: () => clerk.client.signIn.attemptFirstFactor({
          strategy: "reset_password_email_code", code: code.value.trim(), password: password.value,
        }),
      },
    ];
    const notice = "Si el correo está registrado, vas a recibir un código para recuperar tu contraseña.";
    let stage = 0;
    function showStage() {
      for (const input of [email, code, password]) {
        const active = stages[stage].fields.includes(input);
        input.hidden = input.disabled = !active;
        input.required = active;
        input.labels[0].hidden = !active;
      }
      next.textContent = stages[stage].label;
      stages[stage].fields[0].focus();
    }
    recovery.hidden = false;
    showStage();
    recovery.addEventListener("submit", async event => {
      event.preventDefault();
      if (next.disabled) return;
      next.disabled = true;
      feedback.textContent = "";
      try {
        await stages[stage].run();
        if (stage === 1) {
          recovery.reset();
          if (clerk.client.signIn.status === "complete" && clerk.client.signIn.createdSessionId) {
            await clerk.setActive({ session: clerk.client.signIn.createdSessionId });
            location.replace(monitorPath);
          } else {
            location.replace("/");
          }
          return;
        }
        stage++;
        feedback.textContent = notice;
        showStage();
      } catch (error) {
        feedback.textContent = stage === 0 ? notice
          : (error.errors?.[0]?.longMessage || "Revisá el código y los requisitos de la contraseña.");
      } finally {
        next.disabled = false;
      }
    });
  }, { once: true });

  async function renderAccess() {
    const user = clerk.user;
    if (user && (admittedUser === user.id || checkingUser === user.id)) return;
    const pass = ++revision;
    if (!user && monitorRequested) {
      location.replace("/");
      return;
    }
    signOut.hidden = !user;
    if (!user) {
      continueLink.hidden = true;
      status.textContent = "";
      mountForm();
      return;
    }
    if (!monitorRequested) {
      if (mounted === "signup") clerk.unmountSignUp(form);
      if (mounted === "signin") clerk.unmountSignIn(form);
      $("#account-recovery").hidden = true;
      recover.hidden = true;
      mounted = null;
      status.textContent = "Ya iniciaste sesión.";
      continueLink.hidden = false;
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
