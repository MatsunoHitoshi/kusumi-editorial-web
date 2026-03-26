import { ContentManager } from "@/components/editor/ContentManager";
import { PublishPanel } from "@/components/PublishPanel";

export default function AdminDashboard() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold">管理ダッシュボード</h1>
      <p className="mt-3 text-zinc-700">
        固定ページ、記事、プロジェクト、読書会の編集をここで行います。
      </p>
      <div className="mt-8">
        <PublishPanel />
      </div>
      <section className="mt-8">
        <ContentManager />
      </section>
    </main>
  );
}
