import type { ImageGalleryElement } from "./types";

/** 图册组件登记的动作：菜单命令与外框按键经命令 id 找到对应的图册 */
export const galleryActions = new WeakMap<
  ImageGalleryElement,
  { openSettings(): void; preview(index?: number): void }
>();
