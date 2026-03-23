"use client";

import { useState } from "react";

import { motion } from "framer-motion";

import { useToast } from "@/components/providers/AppProviders";

type PostPreviewProps = {
  brandName: string;
  platform: string;
  text: string;
  hashtags: string[];
  imagePrompt: string;
  imageBase64?: string | null;
};

function downloadImage(imageBase64: string, platform: string) {
  const link = document.createElement("a");
  link.href = `data:image/png;base64,${imageBase64}`;
  link.download = `autopilot-${platform.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
  link.click();
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="M9 4.75h6M9.75 3h4.5A1.75 1.75 0 0 1 16 4.75v.5H8v-.5A1.75 1.75 0 0 1 9.75 3Z" />
      <path d="M8 5.25H6.75A1.75 1.75 0 0 0 5 7v11.25C5 19.22 5.78 20 6.75 20h10.5c.97 0 1.75-.78 1.75-1.75V7c0-.97-.78-1.75-1.75-1.75H16" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[2]">
      <path d="m5 12.5 4.2 4.2L19 7.5" />
    </svg>
  );
}

export function PostPreview({ brandName, platform, text, hashtags, imagePrompt, imageBase64 }: PostPreviewProps) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  async function handleCopy() {
    await navigator.clipboard.writeText([text, hashtags.join(" ")].filter(Boolean).join("\n\n"));
    setCopied(true);
    showToast("Copiado al portapapeles");
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="overflow-hidden rounded-[1.75rem] border border-black/10 bg-white/85 shadow-panel dark:border-white/10 dark:bg-white/5"
    >
      <div className="flex items-center justify-between border-b border-black/10 px-5 py-4 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-biz text-sm font-semibold text-white">
            {brandName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold">{brandName}</p>
            <p className="text-xs text-black/50 dark:text-white/50">@autopilot-preview</p>
          </div>
        </div>
        <span className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-black/65 dark:border-white/10 dark:text-white/65">
          {platform}
        </span>
      </div>

      <div className="space-y-4 p-5">
        <div className="aspect-[4/3] overflow-hidden rounded-[1.25rem] border border-black/10 bg-[radial-gradient(circle_at_top,rgba(127,119,221,0.18),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(247,243,236,0.88))] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top,rgba(127,119,221,0.22),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]">
          {imageBase64 ? (
            <img
              src={`data:image/png;base64,${imageBase64}`}
              alt={`Preview generado para ${platform}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-8 text-center text-sm leading-6 text-black/45 dark:text-white/45">
              Placeholder visual de la imagen generada
            </div>
          )}
        </div>

        <div>
          <p className="text-sm leading-7 text-black/78 dark:text-white/78">{text}</p>
          {hashtags.length > 0 ? (
            <p className="mt-3 text-xs text-black/50 dark:text-white/50">{hashtags.join(" ")}</p>
          ) : null}
          {imagePrompt ? (
            <div className="mt-4 rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
                Prompt visual
              </p>
              <p className="mt-2 text-xs leading-6 text-black/60 dark:text-white/60">{imagePrompt}</p>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between text-xs text-black/45 dark:text-white/45">
          <span>{text.length} caracteres</span>
          <span>Vista previa</span>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-black"
          >
            {copied ? <CheckIcon /> : <ClipboardIcon />}
            {copied ? "Copiado" : "Copiar texto"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (imageBase64) {
                downloadImage(imageBase64, platform);
                showToast("Imagen descargada");
              }
            }}
            disabled={!imageBase64}
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-black/70 transition hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-white/70 dark:hover:border-white/20"
          >
            Descargar imagen
          </button>
        </div>
      </div>
    </motion.article>
  );
}
