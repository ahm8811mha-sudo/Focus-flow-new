import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/usePwaInstall";

export default function PwaInstallButton() {
  const { canInstall, install } = usePwaInstall();

  if (!canInstall) return null;

  return (
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-[calc(1rem+env(safe-area-inset-left))] z-[80] md:bottom-[calc(1rem+env(safe-area-inset-bottom))]">
      <Button
        type="button"
        onClick={install}
        className="h-11 rounded-full border border-white/15 bg-white text-slate-950 shadow-2xl shadow-black/30 hover:bg-slate-100"
      >
        <Download className="size-4" />
        تثبيت التطبيق
      </Button>
    </div>
  );
}
