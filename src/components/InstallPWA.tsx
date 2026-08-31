import { Download, Share, Smartphone, Monitor } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPWA() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleClick = () => {
    if (deferred) {
      void deferred.prompt();
      void deferred.userChoice.then(() => setDeferred(null));
    } else {
      setShowHint((v) => !v);
    }
  };

  const isDesktop = !isIos && !deferred;

  return (
    <div className="relative flex flex-col items-center gap-1">
      <Button
        size="sm"
        variant="outline"
        className="rounded-full text-xs"
        onClick={handleClick}
        aria-label={ar ? "ثبّت التطبيق" : "Install app"}
      >
        <Download className="me-1 size-3.5" />
        {installed
          ? (ar ? "تم التثبيت" : "Installed")
          : (ar ? "تثبيت" : "Install")}
      </Button>

      {showHint && (
        <div className="absolute top-full z-50 mt-2 w-64 rounded-2xl border border-border bg-card p-3 shadow-lg">
          {isIos ? (
            <p className="text-center text-xs text-muted-foreground">
              <Share className="me-1 inline size-3" />
              {ar
                ? "من سفاري: اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»."
                : "In Safari: tap Share, then “Add to Home Screen”."}
            </p>
          ) : isDesktop ? (
            <p className="text-center text-xs text-muted-foreground">
              <Monitor className="me-1 inline size-3" />
              {ar
                ? "من قائمة المتصفح: اضغط ⋮ ثم Install/تثبيت التطبيق."
                : "From the browser menu: tap ⋮ then Install app."}
            </p>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              <Smartphone className="me-1 inline size-3" />
              {ar
                ? "من قائمة المتصفح: اضغط ⋮ ثم «إضافة إلى الشاشة الرئيسية»."
                : "From the browser menu: tap ⋮ then “Add to Home Screen”."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
