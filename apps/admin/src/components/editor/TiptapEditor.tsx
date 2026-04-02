"use client";

import { useMemo, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { generateHTML } from "@tiptap/html";
import type { JSONContent } from "@tiptap/core";
import { createTiptapExtensions } from "@/lib/tiptap-extensions";

function normalizeEmptyParagraphs(doc: unknown): JSONContent {
  if (!doc || typeof doc !== "object" || !("content" in doc)) {
    return doc as JSONContent;
  }

  const root = doc as { content?: unknown[] };
  if (!Array.isArray(root.content)) return doc as JSONContent;

  const nextContent = root.content.map((node) => {
    if (!node || typeof node !== "object") return node;
    const n = node as { type?: unknown; content?: unknown[] };
    if (n.type === "paragraph" && (!("content" in n) || !Array.isArray(n.content) || n.content.length === 0)) {
      return { ...n, content: [{ type: "hardBreak" }] };
    }
    return node;
  });

  return { ...(doc as object), content: nextContent } as JSONContent;
}

interface Props {
  value: Record<string, unknown>;
  contentType: "page" | "article" | "project" | "reading" | "publication";
  onChange: (value: Record<string, unknown>) => void;
}

export function TiptapEditor({ value, contentType, onChange }: Props) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const extensions = useMemo(() => createTiptapExtensions(), []);

  const previewHtml = useMemo(() => {
    try {
      return generateHTML(normalizeEmptyParagraphs(value), extensions);
    } catch {
      return "<p class=\"text-zinc-500\">プレビューできない形式です。</p>";
    }
  }, [value, extensions]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions,
      content: value,
      editorProps: {
        attributes: {
          class:
            "min-h-[280px] rounded border border-zinc-300 p-4 focus:outline-none prose prose-zinc font-serif prose-headings:font-serif prose-a:break-all max-w-none max-sm:prose-sm"
        }
      },
      onUpdate({ editor: ed }) {
        onChange(ed.getJSON() as Record<string, unknown>);
      }
    },
    [extensions]
  );

  async function uploadImage(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("contentType", contentType);
    const response = await fetch("/api/admin/upload-image", {
      method: "POST",
      body: formData
    });
    if (!response.ok) {
      throw new Error("image upload failed");
    }
    const data = (await response.json()) as { url: string };
    editor?.chain().focus().setImage({ src: data.url }).run();
  }

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/60 pt-2 pb-2">
        <div className="flex rounded border border-zinc-200 p-0.5 text-sm">
          <button
            type="button"
            className={`rounded px-3 py-1 ${mode === "edit" ? "bg-zinc-900 text-white" : "text-zinc-600"}`}
            onClick={() => setMode("edit")}
          >
            編集
          </button>
          <button
            type="button"
            className={`rounded px-3 py-1 ${mode === "preview" ? "bg-zinc-900 text-white" : "text-zinc-600"}`}
            onClick={() => setMode("preview")}
          >
            簡易プレビュー
          </button>
        </div>
        {mode === "edit" && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border px-2 py-1 text-sm"
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              太字
            </button>
            <button
              type="button"
              className="rounded border px-2 py-1 text-sm"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              見出し2
            </button>
            <button
              type="button"
              className="rounded border px-2 py-1 text-sm"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              リスト
            </button>
            <button
              type="button"
              className="rounded border px-2 py-1 text-sm"
              onClick={() => {
                const href = window.prompt("URLを入力");
                if (!href) return;
                editor?.chain().focus().setLink({ href }).run();
              }}
            >
              リンク
            </button>
            <label className="rounded border px-2 py-1 text-sm">
              画像
              <input
                className="hidden"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={async (event) => {
                  const input = event.currentTarget;
                  const file = event.target.files?.[0];
                  if (!file) return;
                  await uploadImage(file);
                  input.value = "";
                }}
              />
            </label>
          </div>
        )}
      </div>

      {mode === "edit" ? (
        <div className="relative">
          {editor ? (
            <BubbleMenu
              editor={editor}
              updateDelay={100}
              resizeDelay={60}
              options={{
                placement: "bottom-start",
                offset: { mainAxis: 0, crossAxis: 8 }
              }}
              shouldShow={({ editor: ed, from, to }) => ed.isEditable && from !== to}
            >
              <div className="flex items-center gap-1 rounded border border-zinc-200 bg-white p-1 shadow-sm">
                <button
                  type="button"
                  className={`rounded px-2 py-1 text-xs ${
                    editor.isActive("bold")
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-700 hover:bg-zinc-50"
                  }`}
                  onClick={() => editor.chain().focus().toggleBold().run()}
                >
                  太字
                </button>
                <button
                  type="button"
                  className={`rounded px-2 py-1 text-xs ${
                    editor.isActive("heading", { level: 2 })
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-700 hover:bg-zinc-50"
                  }`}
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                >
                  見出し2
                </button>
                <button
                  type="button"
                  className={`rounded px-2 py-1 text-xs ${
                    editor.isActive("bulletList")
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-700 hover:bg-zinc-50"
                  }`}
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                >
                  リスト
                </button>
                <button
                  type="button"
                  className={`rounded px-2 py-1 text-xs ${
                    editor.isActive("link")
                      ? "bg-amber-700 text-white hover:bg-amber-800"
                      : "text-zinc-700 hover:bg-zinc-50"
                  }`}
                  onClick={() => {
                    if (editor.isActive("link")) {
                      editor.chain().focus().unsetLink().run();
                      return;
                    }
                    const href = window.prompt("URLを入力");
                    if (!href) return;
                    editor.chain().focus().setLink({ href }).run();
                  }}
                >
                  {editor.isActive("link") ? "リンク解除" : "リンク"}
                </button>
              </div>
            </BubbleMenu>
          ) : null}
          <EditorContent editor={editor} />
        </div>
      ) : (
        <div
          className="min-h-[280px] rounded border border-zinc-200 bg-zinc-50/80 p-6 prose prose-zinc font-serif prose-headings:font-serif prose-a:break-all prose-img:rounded-md max-w-none max-sm:prose-sm"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      )}
    </div>
  );
}
