import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import type { Extensions } from "@tiptap/core";

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      widthPercent: {
        default: 100,
        parseHTML: (element) => {
          const raw = element.getAttribute("data-width-percent");
          if (!raw) return 100;
          const n = Number(raw);
          if (!Number.isFinite(n)) return 100;
          return Math.min(100, Math.max(10, n));
        },
        renderHTML: (attributes) => {
          const widthPercent = Number(attributes.widthPercent ?? 100);
          const safe = Number.isFinite(widthPercent) ? Math.min(100, Math.max(10, widthPercent)) : 100;
          return {
            "data-width-percent": String(safe),
            class: "content-image",
            style: `width: ${safe}%; max-width: 100%; height: auto;`
          };
        }
      }
    };
  }
});

/**
 * 管理画面（admin）と同じ拡張セット。HTML 生成と表示の互換を保つ。
 */
export function createTiptapExtensions(): Extensions {
  return [
    StarterKit.configure({
      link: { openOnClick: false }
    }),
    ResizableImage.configure({ inline: false })
  ];
}
