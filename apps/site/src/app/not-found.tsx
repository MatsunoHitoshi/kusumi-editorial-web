import Link from "next/link";

import { siteConfig } from "@/lib/site-config";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="font-serif text-2xl text-zinc-900">ページが見つかりません</h1>
      <p className="mt-4 text-sm text-zinc-600 leading-relaxed">
        URL が間違っているか、公開が終了した可能性があります。
      </p>
      <Link
        href="/"
        className="mt-8 inline-block text-sm font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-600"
      >
        {siteConfig.shortName}へ戻る
      </Link>
    </main>
  );
}
