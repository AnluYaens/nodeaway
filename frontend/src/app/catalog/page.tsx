import { CatalogGrid } from "@/components/CatalogGrid";

export default function CatalogPage() {
  return (
    <main className="min-h-screen px-6 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <CatalogGrid />
      </div>
    </main>
  );
}
