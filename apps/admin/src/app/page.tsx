import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold">Kusumi Admin</h1>
      <p className="mt-4 text-zinc-700">
        管理アプリの初期雛形です。公開反映は admin ロールで実行します。
      </p>
      <ul className="mt-8 list-disc space-y-2 pl-6">
        <li>
          <Link className="text-blue-700 underline" href="/admin">
            管理ダッシュボード
          </Link>
        </li>
      </ul>
    </main>
  );
}
