import { ResultsView } from "@/components/ResultsView";

export const dynamic = "force-dynamic";

type ResultsPageProps = {
  params: {
    executionId: string;
  };
};

export default function ResultsPage({ params }: ResultsPageProps) {
  return (
    <main className="min-h-screen px-6 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <ResultsView executionId={params.executionId} />
      </div>
    </main>
  );
}
