import { HistoryList } from "@/components/HistoryList";

export default function HistoryPage() {
  return (
    <main className="min-h-screen px-6 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-black/50 dark:text-white/50">
            Historial
          </p>
          <h1 className="mt-3 font-display text-5xl leading-none sm:text-6xl">
            Todas tus ejecuciones en un solo lugar.
          </h1>
        </div>
        <HistoryList />
      </div>
    </main>
  );
}
