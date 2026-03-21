export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-20">
      <div className="w-full max-w-3xl rounded-[2rem] border border-black/10 bg-white/80 p-10 shadow-panel backdrop-blur dark:border-white/10 dark:bg-white/5">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-dev">
          AutoPilot
        </p>
        <h1 className="mt-6 font-display text-5xl leading-none text-balance sm:text-6xl">
          Automatizaciones listas para usar.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-black/70 dark:text-white/70">
          Bootstrap inicial del proyecto. El catálogo, formularios dinámicos y resultados
          llegarán en los siguientes pasos.
        </p>
      </div>
    </main>
  );
}
