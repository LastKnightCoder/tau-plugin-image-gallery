import type { Descendant } from "@tau/plugins";

export const GALLERY_TYPE = "image-gallery";

/** 布局：横向排版 / 瀑布流 / 轮播；数值与已有文档一致，不能改 */
export const GalleryMode = {
  Horizontal: 1,
  Vertical: 2,
  Inline: 3,
} as const;
export type GalleryMode = (typeof GalleryMode)[keyof typeof GalleryMode];

export type AppearancePreset = "none" | "sm" | "md" | "lg";

export interface ImageGalleryItem {
  id: string;
  url: string;
  desc?: string;
  width?: number;
  height?: number;
}

export type LastRowMode = "justify" | "nojustify" | "center" | "right" | "hide";

export type ObjectFitMode = "contain" | "cover";

export interface ImageGalleryElement {
  type: typeof GALLERY_TYPE;
  mode: GalleryMode;
  height?: number;
  images: ImageGalleryItem[];
  wider?: boolean;
  columnCount?: number;
  margins?: number;
  lastRow?: LastRowMode;
  objectFit?: ObjectFitMode;
  borderRadius?: AppearancePreset;
  shadow?: AppearancePreset | boolean;
  children: Descendant[];
}

export type GallerySetting = Omit<ImageGalleryElement, "type" | "children">;

declare module "@tau/plugins" {
  interface EditorElementMap {
    "image-gallery": ImageGalleryElement;
  }
}
