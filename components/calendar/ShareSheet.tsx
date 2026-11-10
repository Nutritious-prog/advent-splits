"use client";
import { useEffect, useState } from "react";
import { Copy, Download, ExternalLink, Link2, Share2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

const HANDLE = process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE || "wlod_run";

export function ShareSheet({
  open,
  onClose,
  imageUrl,
  fileName,
  shareText,
  hasResult,
  withResult,
  setWithResult,
  title = "Udostępnij",
  caption,
}: {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName: string;
  shareText: string;
  hasResult?: boolean;
  withResult?: boolean;
  setWithResult?: (v: boolean) => void;
  title?: string;
  /** Ready-made Instagram caption (editable before copying). */
  caption?: string;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<"share" | "download" | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [bust] = useState(() => Date.now());
  const fullCaption = caption ? `${caption}

#theadventsplits @${HANDLE}` : "";
  const [captionText, setCaptionText] = useState(fullCaption);
  useEffect(() => setCaptionText(fullCaption), [fullCaption]);
  const src = `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}v=${bust}`;

  useEffect(() => setLoaded(false), [src]);
  useEffect(() => {
    try {
      const f = new File([new Blob()], "x.png", { type: "image/png" });
      setCanShareFiles(!!navigator.canShare?.({ files: [f] }));
    } catch {
      setCanShareFiles(false);
    }
  }, []);

  async function getFile() {
    const res = await fetch(src, { credentials: "same-origin" });
    if (!res.ok) throw new Error("Nie udało się wygenerować grafiki.");
    const blob = await res.blob();
    return new File([blob], fileName, { type: "image/png" });
  }

  async function share() {
    setBusy("share");
    try {
      const file = await getFile();
      await navigator.share({ files: [file], text: captionText || shareText });
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast("error", "Udostępnianie nie zadziałało", "Pobierz grafikę i dodaj ją ręcznie w relacji.");
    } finally {
      setBusy(null);
    }
  }

  async function download() {
    setBusy("download");
    try {
      const file = await getFile();
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast("success", "Grafika zapisana", "Dodaj ją w relacji na Instagramie.");
    } catch (e) {
      toast("error", "Nie udało się pobrać", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(captionText);
      toast("success", "Podpis skopiowany", "Wklej go pod relacją lub postem.");
    } catch {
      toast("info", "Zaznacz i skopiuj ręcznie", "Schowek jest zablokowany w tej przeglądarce.");
    }
  }

  async function copyLink() {
    const link = window.location.origin;
    try {
      await navigator.clipboard.writeText(`${shareText} ${link}`);
      toast("success", "Skopiowano", "Wklej znajomym. Niech też cierpią.");
    } catch {
      toast("info", "Skopiuj ręcznie", link);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} label={title} wide>
      <div className="p-5 pt-6 sm:p-8">
        <p className="eyebrow">Format relacji 1080 × 1920</p>
        <h2 className="display mt-2 text-4xl">{title}</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-[220px_1fr]">
          <div className="relative mx-auto aspect-[9/16] w-48 overflow-hidden border border-line bg-charcoal sm:w-full">
            {!loaded && <div className="skeleton absolute inset-0" aria-hidden />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Podgląd grafiki do relacji"
              className={`h-full w-full object-cover transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setLoaded(true)}
              onError={() => {
                setLoaded(true);
                toast("error", "Nie udało się wygenerować grafiki", "Spróbuj ponownie za chwilę.");
              }}
            />
          </div>
          <div className="flex flex-col gap-3">
            {hasResult && setWithResult && (
              <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 border border-line px-4">
                <span className="text-sm font-semibold">Pokaż mój wynik na grafice</span>
                <input type="checkbox" checked={!!withResult} onChange={(e) => setWithResult(e.target.checked)} className="h-5 w-5 accent-[#D6A441]" />
              </label>
            )}
            {caption && (
              <div className="border border-line p-3">
                <label htmlFor="caption" className="eyebrow">
                  Gotowy podpis
                </label>
                <textarea
                  id="caption"
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                  rows={3}
                  className="mt-2 w-full resize-none bg-transparent text-sm leading-relaxed text-cream/90 focus:outline-none"
                />
                <Button variant="outline" size="sm" onClick={copyCaption} className="mt-1 w-full">
                  <Copy size={14} /> Kopiuj podpis
                </Button>
              </div>
            )}
            {canShareFiles && (
              <Button onClick={share} loading={busy === "share"} size="lg">
                <Share2 size={18} /> Udostępnij
              </Button>
            )}
            <Button onClick={download} loading={busy === "download"} variant={canShareFiles ? "outline" : "primary"} size="lg">
              <Download size={18} /> Pobierz grafikę
            </Button>
            <a
              href={src}
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-12 items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-cream/60 hover:text-cream"
            >
              <ExternalLink size={15} /> Otwórz obraz (przytrzymaj, aby zapisać)
            </a>
            <Button onClick={copyLink} variant="ghost" size="md">
              <Link2 size={16} /> Kopiuj link do kalendarza
            </Button>
            <p className="mt-1 text-sm leading-relaxed text-cream/60">
              Przeglądarka nie może sama opublikować relacji. Zapisz grafikę, dodaj ją w Instagramie i oznacz{" "}
              <span className="font-semibold text-mustard">@{HANDLE}</span>. Bonus za zaproszenie znajomych.
            </p>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
