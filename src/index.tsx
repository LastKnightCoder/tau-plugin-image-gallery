import { editorMetrics } from "./metrics";
import { Images } from "lucide-react";
import {
  defineEditorElement,
  defineEditorExtension,
  definePlugin,
  insertSourceBlock,
  type PluginEditorExtension,
} from "@tau/plugins";
import Gallery from "./components/Gallery";
import { galleryActions } from "./actions";
import { galleryCodec, galleryToHtml } from "./export";
import { GALLERY_TYPE, GalleryMode, type ImageGalleryElement } from "./types";

declare const __PLUGIN_META__: { id: string; name: string; version: string };

const OPEN_SETTINGS = "tau.image-gallery.open-settings";
const PREVIEW = "tau.image-gallery.preview";

const actionsOf = (element: unknown) =>
  (element as ImageGalleryElement | undefined)?.type === GALLERY_TYPE
    ? galleryActions.get(element as ImageGalleryElement)
    : undefined;

export const galleryExtension: PluginEditorExtension = defineEditorExtension({
  id: "tau.image-gallery",
  elements: [
    defineEditorElement<ImageGalleryElement>({
      type: GALLERY_TYPE,
      dataVersion: 1,
      kind: "block",
      isVoid: true,
      drag: true,
      frame: { keys: { Enter: OPEN_SETTINGS, " ": PREVIEW } },
      resources: [
        { path: "images[].url", kind: "image", alt: "desc", caption: "desc" },
      ],
      render: Gallery,
    }),
  ],
  commands: [
    {
      id: OPEN_SETTINGS,
      title: "编辑图册",
      run: (_editor, ctx) => actionsOf(ctx.element)?.openSettings(),
    },
    {
      id: PREVIEW,
      title: "全屏预览",
      run: (_editor, ctx) => actionsOf(ctx.element)?.preview(),
    },
  ],
  menu: [
    {
      id: OPEN_SETTINGS,
      title: "编辑图册",
      icon: <Images size={16} />,
      command: OPEN_SETTINGS,
    },
  ],
  blockPanel: [
    {
      icon: Images,
      title: "图册",
      keywords: ["image-gallery", "图册", "tuce", "gallery", "画廊", "hualang"],
      description: "多张图片横排、瀑布流或轮播",
      onClick: (editor) => {
        insertSourceBlock(editor, {
          type: GALLERY_TYPE,
          mode: GalleryMode.Horizontal,
          images: [],
          children: [{ type: "formatted", text: "" }],
        } as ImageGalleryElement);
      },
    },
  ],
  htmlSerializers: [{ type: GALLERY_TYPE, toHtml: galleryToHtml }],
});

export default definePlugin({
  ...__PLUGIN_META__,
  editorExtensions: [galleryExtension],
  editorMetrics,
  editorCodecs: [galleryCodec],
});
