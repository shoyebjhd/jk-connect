import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("pwaDismissed") === "true");

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const visits = parseInt(localStorage.getItem("pwaVisits") || "0", 10);
      if (visits >= 1) {
        setShow(true);
      }
      localStorage.setItem("pwaVisits", String(visits + 1));
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Also show after 30s even on first visit
  useEffect(() => {
    if (dismissed || !deferredPrompt) return;
    const timer = setTimeout(() => setShow(true), 30000);
    return () => clearTimeout(timer);
  }, [deferredPrompt, dismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setShow(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem("pwaDismissed", "true");
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  if (!show || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-card border shadow-lg rounded-xl p-4 backdrop-blur">
        <p className="text-sm font-medium mb-1">
          {isIOS ? "Install JKAAS" : "Add JKAAS to your homescreen"}
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          {isIOS
            ? "Tap the Share button and select 'Add to Home Screen'."
            : "Install for faster access and offline support."}
        </p>
        <div className="flex gap-2">
          {!isIOS && (
            <Button size="sm" onClick={handleInstall}>Install</Button>
          )}
          <Button size="sm" variant="outline" onClick={handleDismiss}>Dismiss</Button>
        </div>
      </div>
    </div>
  );
}
