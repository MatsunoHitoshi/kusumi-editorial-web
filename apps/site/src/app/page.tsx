import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/lib/site-config";
import { topPageIntro, topPageTableOfContents } from "@/lib/top-page";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: siteConfig.shortName,
  description: siteConfig.description
};

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="space-y-1 font-bold">
        <p className="font-serif text-lg text-zinc-900 sm:text-xl">{topPageIntro.labName}</p>
        <p className="font-serif text-2xl text-zinc-900 sm:text-3xl">{topPageIntro.studioName}</p>
      </div>

      <div className="mt-8 space-y-1 text-sm leading-relaxed text-zinc-700">
        {topPageIntro.affiliations.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <nav id="toc" className="toc-nav mt-14 scroll-mt-24" aria-label="目次">
        <h2 className="sr-only">目次</h2>
        <ol className="list-none space-y-0 border-t border-zinc-200">
          {topPageTableOfContents.map((item, index) => (
            <li key={item.href} className="border-b border-zinc-200">
              <Link
                href={item.href}
                className="flex items-baseline gap-4 py-4 text-zinc-900 transition-colors hover:bg-zinc-50 sm:gap-6 sm:py-5"
              >
                <span
                  className="w-8 shrink-0 font-mono text-sm tabular-nums text-zinc-400 sm:w-10"
                  aria-hidden
                >
                  {(index + 1).toString().padStart(2, "0")}
                </span>
                <span className="font-medium underline decoration-zinc-300 underline-offset-4 decoration-1 hover:decoration-zinc-600">
                  {item.label}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </nav>
    </main>
  );
}
