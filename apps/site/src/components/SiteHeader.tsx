import Link from "next/link";

import { topPageIntro } from "@/lib/top-page";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-4xl gap-1 px-4 py-4 flex-row items-center justify-between sm:gap-4 sm:px-6 sm:py-5">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-zinc-500 sm:text-xs">{topPageIntro.labName}</p>
          <Link href="/" className="mt-1 inline-block font-serif font-semibold text-base text-zinc-900 hover:text-zinc-700">
            {topPageIntro.studioName}
          </Link>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 sm:gap-x-5 sm:text-sm" aria-label="サイト内の主要セクション">
          <Link href="/" className="hover:text-zinc-900">
            ホーム
          </Link>
          <Link href="/#toc" className="hover:text-zinc-900">
            目次
          </Link>
        </nav>
      </div>
    </header>
  );
}
