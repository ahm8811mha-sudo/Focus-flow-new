export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as NavigatorWithStandalone).standalone === true;

export function registerPwa() {
  if (typeof window === "undefined") return;

  document.documentElement.classList.toggle("is-standalone-app", isStandalone());

  window.addEventListener("appinstalled", () => {
    document.documentElement.classList.add("is-standalone-app");
    window.dispatchEvent(new CustomEvent("focus-flow:app-installed"));
  });

  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      })
      .catch((error) => {
        console.warn("[Focus Flow] Service worker registration failed", error);
      });
  });
}
