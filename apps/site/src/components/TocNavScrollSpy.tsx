"use client";

import { useEffect, useState } from "react";

import type { H2TocEntry } from "@/lib/tiptap-page-utils";

interface TocNavScrollSpyProps {
  entries: H2TocEntry[];
}

/** PC: 本文先頭付近。このラインより上に出た最後の h2 を現在位置とする */
const OFFSET_DESKTOP_PX = 96;
/** SP: 固定ヘッダー＋横目次分を多めに */
const OFFSET_MOBILE_PX = 132;

function getScrollOffsetPx(): number {
  if (typeof window === "undefined") return OFFSET_DESKTOP_PX;
  return window.matchMedia("(max-width: 767px)").matches ? OFFSET_MOBILE_PX : OFFSET_DESKTOP_PX;
}

export function TocNavScrollSpy({ entries }: TocNavScrollSpyProps) {
  const [activeId, setActiveId] = useState<string | null>(() => entries[0]?.id ?? null);

  useEffect(() => {
    if (entries.length === 0) {
      setActiveId(null);
      return;
    }

    const update = () => {
      const offset = getScrollOffsetPx();
      let current = entries[0].id;
      for (const e of entries) {
        const el = document.getElementById(e.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= offset) {
          current = e.id;
        }
      }
      setActiveId((prev) => (prev === current ? prev : current));
    };

    setActiveId(entries[0].id);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <nav aria-label="ページ内目次" className="text-sm">
      <ul className="flex w-max flex-row gap-3 overflow-x-auto pb-1 md:w-full md:max-w-none md:flex-col md:gap-0.5 md:overflow-visible md:pb-0">
        {entries.map((e) => {
          const active = activeId === e.id;
          return (
            <li key={e.id} className="shrink-0 md:shrink">
              <a
                href={`#${e.id}`}
                aria-current={active ? "location" : undefined}
                className={[
                  "block whitespace-nowrap px-2 py-1 text-zinc-700 font-semibold md:whitespace-normal",
                  active
                    ? "text-zinc-900 underline decoration-zinc-800 underline-offset-4"
                    : "no-underline hover:text-zinc-900"
                ].join(" ")}
              >
                {e.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
