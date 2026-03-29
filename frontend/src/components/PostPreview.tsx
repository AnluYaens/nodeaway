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
        <div>
          <p className="text-sm leading-7 text-black/78 dark:text-white/78">{text}</p>
          {hashtags.length > 0 ? (
            <p className="mt-4 text-xs tracking-wide text-indigo-500/80 dark:text-indigo-400/80">{hashtags.join(" ")}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-between text-xs text-black/45 dark:text-white/45 pt-4 border-t border-black/5 dark:border-white/5">
          <span>{text.length} caracteres</span>
          <span>Vista previa</span>
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 dark:bg-white dark:text-black"
          >
            {copied ? <CheckIcon /> : <ClipboardIcon />}
            {copied ? "Copiado" : "Copiar texto del post"}
          </button>
        </div>
      </div>
    </motion.article>
  );
}
