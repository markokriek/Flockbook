import { useEffect, useState } from "react";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaControls() {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [offline, setOffline] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)");
    const detect = () =>
      setInstalled(
        display.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
      );
    const connectivity = () => setOffline(!navigator.onLine);
    const prompt = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    const installedEvent = () => {
      setInstalled(true);
      setInstall(null);
    };
    detect();
    connectivity();
    display.addEventListener("change", detect);
    window.addEventListener("online", connectivity);
    window.addEventListener("offline", connectivity);
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("appinstalled", installedEvent);

    let disposed = false;
    const cleanups: Array<() => void> = [];
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((registration) => {
          if (disposed) return;
          const check = () => {
            if (registration.waiting) setWaiting(registration.waiting);
          };
          check();
          const update = () => {
            const worker = registration.installing;
            if (!worker) return;
            const change = () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller) check();
            };
            worker.addEventListener("statechange", change);
            cleanups.push(() => worker.removeEventListener("statechange", change));
          };
          registration.addEventListener("updatefound", update);
          cleanups.push(() => registration.removeEventListener("updatefound", update));
          const refresh = () => {
            if (document.visibilityState === "visible")
              void registration.update().catch(console.error);
          };
          document.addEventListener("visibilitychange", refresh);
          cleanups.push(() => document.removeEventListener("visibilitychange", refresh));
        })
        .catch((error) => console.error("PWA registration failed", error));
    }
    return () => {
      disposed = true;
      cleanups.forEach((cleanup) => cleanup());
      display.removeEventListener("change", detect);
      window.removeEventListener("online", connectivity);
      window.removeEventListener("offline", connectivity);
      window.removeEventListener("beforeinstallprompt", prompt);
      window.removeEventListener("appinstalled", installedEvent);
    };
  }, []);

  async function installApp() {
    if (!install) {
      setHelp(!help);
      return;
    }
    try {
      await install.prompt();
      await install.userChoice;
    } catch (error) {
      console.error("Installation prompt failed", error);
      setHelp(true);
    } finally {
      setInstall(null);
    }
  }

  function updateApp() {
    if (!waiting || !window.confirm("Saved all your changes? Updating will reload Flockbook."))
      return;
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), {
      once: true,
    });
    waiting.postMessage({ type: "SKIP_WAITING" });
  }

  return (
    <aside className="pwa-controls" aria-label="App installation and connection">
      {offline && <p role="status">You’re offline. Reconnect before saving farm records.</p>}
      {!installed && (
        <button type="button" onClick={() => void installApp()} aria-expanded={help}>
          Install Flockbook
        </button>
      )}
      {help && !installed && (
        <p>
          On iPhone or iPad, open this site in Safari, tap Share, then Add to Home Screen and Add.
          On Android, use your browser menu → Install app or Add to Home screen.
        </p>
      )}
      {waiting && (
        <button type="button" onClick={updateApp}>
          Update available — reload
        </button>
      )}
    </aside>
  );
}
