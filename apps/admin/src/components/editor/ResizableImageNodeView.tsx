"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import type { MouseEvent } from "react";

function clampPercent(v: number): number {
  if (!Number.isFinite(v)) return 100;
  return Math.min(100, Math.max(10, v));
}

export function ResizableImageNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const src = String(node.attrs.src ?? "");
  const alt = String(node.attrs.alt ?? "");
  const widthPercent = clampPercent(Number(node.attrs.widthPercent ?? 100));

  function startResize(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const wrapper = (event.currentTarget.closest("[data-resizable-image-wrapper]") as HTMLElement | null) ?? null;
    if (!wrapper) return;

    const editorRoot = (wrapper.closest(".ProseMirror") as HTMLElement | null) ?? null;
    if (!editorRoot) return;

    const startX = event.clientX;
    const imageEl = wrapper.querySelector("img");
    const startWidthPx = imageEl ? imageEl.getBoundingClientRect().width : wrapper.getBoundingClientRect().width;
    const baseWidthPx = Math.max(1, editorRoot.getBoundingClientRect().width);

    const onMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const nextPx = startWidthPx + dx;
      const nextPercent = clampPercent((nextPx / baseWidthPx) * 100);
      updateAttributes({ widthPercent: Math.round(nextPercent * 10) / 10 });
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <NodeViewWrapper
      as="div"
      className={`my-3 block ${selected ? "outline outline-2 outline-zinc-300 outline-offset-2" : ""}`}
      data-resizable-image-wrapper
    >
      <div className="relative inline-block max-w-full">
        <img
          src={src}
          alt={alt}
          className="content-image block h-auto max-w-full rounded"
          style={{ width: `${widthPercent}%` }}
          draggable={false}
        />
        <button
          type="button"
          aria-label="画像サイズを変更"
          className="absolute bottom-1 right-1 h-4 w-4 cursor-se-resize rounded-sm border border-zinc-500 bg-white/90"
          onMouseDown={startResize}
        />
      </div>
    </NodeViewWrapper>
  );
}
