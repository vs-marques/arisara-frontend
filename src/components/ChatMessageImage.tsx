import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

type ChatMessageImageProps = {
  src: string;
  alt: string;
};

export default function ChatMessageImage({ src, alt }: ChatMessageImageProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full rounded-lg overflow-hidden border border-white/10 my-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        aria-label={t("chat.imageExpand")}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-auto max-h-96 object-contain bg-black/20 transition-transform duration-200 group-hover:scale-[1.01] cursor-zoom-in"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
        <span
          className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-white/90 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden
        >
          <ZoomIn className="h-3 w-3" />
          {t("chat.imageExpand")}
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[min(96vw,56rem)] gap-3 border-white/10 bg-black/95 p-3 sm:p-4">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <div className="flex max-h-[85vh] min-h-[12rem] items-center justify-center">
            <img
              src={src}
              alt={alt}
              className="max-h-[85vh] w-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 text-xs text-white/60 hover:text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t("chat.imageOpenNewTab")}
          </a>
        </DialogContent>
      </Dialog>
    </>
  );
}
