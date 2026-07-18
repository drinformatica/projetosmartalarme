import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-install-dismissed-at";
const DAY = 1000 * 60 * 60 * 24;

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const last = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (last && Date.now() - last < 7 * DAY) return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS
      window.navigator.standalone === true;
    if (isStandalone) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setTimeout(() => setVisible(true), 1500);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS: no beforeinstallprompt — show a hint after a delay
    const ua = window.navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS/i.test(ua);
    if (isIOS) {
      setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 2000);
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    dismiss();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <img src="/pwa-192.png" alt="" width={40} height={40} className="rounded-md" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">Instalar o Intrusão 2.0</p>
          {iosHint ? (
            <p className="mt-1 text-xs text-slate-600">
              No iPhone/iPad: toque em <strong>Compartilhar</strong> e depois em{" "}
              <strong>Adicionar à Tela de Início</strong>.
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-600">
              Acesse rapidamente e trabalhe offline instalando o app no seu dispositivo.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {!iosHint && evt && (
              <button
                onClick={install}
                className="rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800"
              >
                Instalar
              </button>
            )}
            <button
              onClick={dismiss}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
