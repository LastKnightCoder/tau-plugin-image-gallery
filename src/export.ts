import type { EditorMarkdownCodec } from "@tau/plugins";
import { GALLERY_TYPE, type ImageGalleryItem } from "./types";

const images = (element: Record<string, unknown>): ImageGalleryItem[] =>
  Array.isArray(element.images)
    ? (element.images as ImageGalleryItem[]).filter(
        (item) => typeof item?.url === "string" && item.url,
      )
    : [];

const escapeAttribute = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Markdown 只保留图片本身：每张一行；布局与外观不进 Markdown */
export const galleryCodec: EditorMarkdownCodec = {
  type: GALLERY_TYPE,
  serializer: {
    isBlock: true,
    toMarkdown: (element) =>
      images(element)
        .map((image) => `![](${image.url})`)
        .join("\n"),
  },
};

const IMAGE_STYLE =
  "display:block;margin:0 auto;width:100%;height:200px;object-fit:contain;border-radius:8px;";

/** 静态 HTML / EPUB / 公众号：横向滑动的一排图片，样式内联，不依赖宿主样式表 */
export function galleryToHtml(element: Record<string, unknown>): string {
  const list = images(element);
  if (!list.length) return "";
  const slides = list
    .map(
      (image) =>
        `<section style="flex:0 0 100%;"><img src="${escapeAttribute(image.url)}" alt="${escapeAttribute(image.desc ?? "")}" style="${IMAGE_STYLE}" /></section>`,
    )
    .join("");
  const hint =
    list.length > 1
      ? '<p style="text-align:center;margin:0;padding:0;"><span style="display:block;color:#888;font-size:14px;line-height:1.8em;">左右滑动查看更多</span></p>'
      : "";
  return `<section style="margin:20px 0 10px;overflow:hidden;"><section style="display:flex;flex-wrap:nowrap;overflow-x:scroll;">${slides}</section></section>${hint}`;
}
