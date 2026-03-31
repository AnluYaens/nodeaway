"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { motion, AnimatePresence } from "framer-motion";

import { submitSuggestion } from "@/lib/api";
import { useToast } from "@/components/providers/AppProviders";

const categories = [
  { value: "", label: "Selecciona una categoria (opcional)" },
  { value: "dev", label: "Developers" },
  { value: "life", label: "Personal" },
  { value: "biz", label: "Negocios" },
];

const inputBase =
  "w-full rounded-2xl border bg-white/70 px-4 py-4 text-sm outline-none transition-all duration-300 dark:bg-white/5 placeholder:text-black/40 dark:placeholder:text-white/40 border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 focus:border-dev dark:focus:border-dev focus:bg-white dark:focus:bg-white/10";

export default function SuggestPage() {
  const { showToast } = useToast();
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [contacto, setContacto] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!descripcion.trim()) {
      setError("Describe la automatizacion que te gustaria ver.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await submitSuggestion({
        descripcion: descripcion.trim(),
        ...(categoria && { categoria }),
        ...(contacto.trim() && { contacto: contacto.trim() }),
      });
      setSubmitted(true);
      showToast("Sugerencia enviada");
    } catch {
      setError("No se pudo enviar la sugerencia. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="glass-panel-strong overflow-hidden rounded-[2rem] p-8 shadow-panel sm:p-10"
      >
        {/* Gradient accent bar */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1"
          style={{ background: "linear-gradient(90deg, #7F77DD, #1D9E75, #D85A30)" }}
        />

        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 text-sm text-black/55 transition hover:text-black dark:text-white/55 dark:hover:text-white group"
        >
          <span className="transition-transform group-hover:-translate-x-1">&larr;</span> Volver al catalogo
        </Link>

        <div className="mt-6">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-4xl leading-tight sm:text-5xl">
              Sugiere una automatizacion
            </h1>
            <span className="mt-1 inline-flex items-center rounded-full border border-dev/25 bg-dev/10 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-dev">
              Beta
            </span>
          </div>
          <p className="mt-3 text-sm leading-7 text-black/60 dark:text-white/60">
            Cuentanos que automatizacion te gustaria ver en Nodeaway. Evaluamos cada sugerencia para
            futuras versiones.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="mt-10 rounded-2xl border border-life/25 bg-life/8 p-6 text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-life/15">
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-life stroke-[2.5]">
                  <path d="m5 12.5 4.2 4.2L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="mt-4 font-display text-2xl">Gracias por tu sugerencia</p>
              <p className="mt-2 text-sm text-black/58 dark:text-white/58">
                La revisaremos y evaluaremos para futuras versiones de Nodeaway.
              </p>
              <Link
                href="/catalog"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-black/5 px-5 py-2.5 text-sm font-medium transition hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                Volver al catalogo
              </Link>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              exit={{ opacity: 0, y: -10 }}
              className="mt-8 space-y-5"
              onSubmit={handleSubmit}
            >
              <div>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Describe la automatizacion que te gustaria ver... *"
                  rows={4}
                  className={`${inputBase} resize-none`}
                />
              </div>

              <div>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className={`${inputBase} cursor-pointer ${!categoria ? "text-black/40 dark:text-white/40" : ""}`}
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value} className="text-black dark:bg-night dark:text-white">
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  type="email"
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                  placeholder="Tu email para notificarte (opcional)"
                  className={inputBase}
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden rounded-2xl border border-rose-300 bg-rose-50 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                  >
                    <div className="px-4 py-3">{error}</div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={submitting}
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-full px-8 py-3.5 text-sm font-semibold text-white transition-all duration-300 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #7F77DD, #1D9E75, #D85A30)" }}
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                {!submitting && (
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                )}
                <span className="relative flex items-center gap-2">
                  {submitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar sugerencia
                      <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
                    </>
                  )}
                </span>
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
