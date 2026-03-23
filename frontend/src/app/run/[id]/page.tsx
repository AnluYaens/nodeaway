import { DynamicForm } from "@/components/DynamicForm";

export const dynamic = "force-dynamic";

type RunPageProps = {
  params: {
    id: string;
  };
};

export default function RunRecipePage({ params }: RunPageProps) {
  return (
    <main className="min-h-screen px-6 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <DynamicForm recipeId={params.id} />
      </div>
    </main>
  );
}
