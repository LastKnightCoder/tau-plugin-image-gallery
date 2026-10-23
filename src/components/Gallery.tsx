import { useEffect, useState } from "react";
import {
  Columns3,
  GalleryHorizontalEnd,
  ImagePlus,
  Images,
  Maximize2,
  MoreHorizontal,
  Rows3,
} from "lucide-react";
import { Button, Dialog, DialogBody, cn } from "@tau/ui";
import {
  BlockToolbar,
  BlockToolbarButton,
  BlockToolbarGap,
  useElement,
  useMediaAppearance,
  useMediaViewer,
  type EditorElementRenderProps,
} from "@tau/plugins";
import {
  GalleryMode,
  type GallerySetting,
  type ImageGalleryElement,
} from "../types";
import { galleryActions } from "../actions";
import HorizontalGallery from "./HorizontalGallery";
import VerticalGallery from "./VerticalGallery";
import SwipeGallery from "./SwipeGallery";
import { GallerySettings } from "./GallerySettings";

const LAYOUTS = [
  { mode: GalleryMode.Horizontal, label: "横排", Icon: Rows3 },
  { mode: GalleryMode.Vertical, label: "瀑布流", Icon: Columns3 },
  { mode: GalleryMode.Inline, label: "轮播", Icon: GalleryHorizontalEnd },
] as const;

const settingOf = ({
  type: _type,
  children: _children,
  ...setting
}: ImageGalleryElement) => setting as GallerySetting;

/** 外框负责点选、右键菜单、删除与添加段落；这里只渲染图册内容、属性条与编辑弹窗 */
export default function Gallery({
  element,
}: EditorElementRenderProps<ImageGalleryElement>) {
  const { readOnly, selected, update, openMenu } = useElement(element);
  const openViewer = useMediaViewer(element);
  const appearance = useMediaAppearance();
  const [editing, setEditing] = useState<GallerySetting | null>(null);
  const { mode, images, wider } = element;
  const borderRadius =
    element.borderRadius ?? appearance?.borderRadius ?? "none";
  const shadow = element.shadow ?? appearance?.shadow ?? "none";

  const openSettings = () => {
    if (!readOnly) setEditing(settingOf(element));
  };
  const preview = (index = 0) => openViewer(index);

  // 选中时的 Enter / 空格经外框按键命令找到这里
  useEffect(() => {
    galleryActions.set(element, { openSettings, preview });
    return () => {
      galleryActions.delete(element);
    };
  });

  useEffect(() => {
    if (readOnly) setEditing(null);
  }, [readOnly]);

  const save = () => {
    if (editing) update({ ...editing });
    setEditing(null);
  };

  const layoutProps = {
    items: images,
    borderRadius,
    shadow,
    // 只读时单击直接预览；编辑时单击只选中（外框处理），双击预览
    onItemClick: (index: number) => {
      if (readOnly) preview(index);
    },
    onItemDoubleClick: preview,
    onUpdateDimensions: readOnly
      ? undefined
      : (next: ImageGalleryElement["images"]) => update({ images: next }),
  };

  return (
    <div className="ig:@container">
    <div
      className={cn(
        "ig:relative",
        wider && "ig:@min-[60rem]:w-[calc(100%+10em)] ig:@min-[60rem]:-translate-x-[5em]",
      )}
    >
      {images.length > 0 ? (
        <div className={cn(!readOnly && !selected && "ig:cursor-pointer")}>
          {!readOnly && selected && (
            <BlockToolbar label="图册属性">
              {LAYOUTS.map(({ mode: value, label, Icon }) => (
                <BlockToolbarButton
                  key={value}
                  title={label}
                  icon={<Icon size={15} />}
                  active={mode === value}
                  onClick={() => update({ mode: value })}
                />
              ))}
              <BlockToolbarGap />
              <BlockToolbarButton
                title="编辑图片"
                shortcut="Enter"
                label="编辑图片"
                icon={<Images size={15} />}
                onClick={openSettings}
              />
              <BlockToolbarButton
                title="全屏预览"
                shortcut="Space"
                icon={<Maximize2 size={15} />}
                onClick={() => preview()}
              />
              <BlockToolbarGap />
              <BlockToolbarButton
                title="更多"
                icon={<MoreHorizontal size={15} />}
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  openMenu({ x: rect.left, y: rect.bottom + 6 });
                }}
              />
            </BlockToolbar>
          )}
          {mode === GalleryMode.Vertical ? (
            <VerticalGallery
              {...layoutProps}
              columnCount={element.columnCount ?? 3}
              gap={element.margins ?? 8}
            />
          ) : mode === GalleryMode.Inline ? (
            <SwipeGallery {...layoutProps} objectFit={element.objectFit} />
          ) : (
            <HorizontalGallery
              {...layoutProps}
              height={element.height}
              margins={element.margins ?? 8}
              lastRow={element.lastRow ?? "nojustify"}
            />
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={readOnly}
          onClick={openSettings}
          className="ig:text-tau-body ig:flex ig:w-full ig:cursor-pointer ig:items-center ig:justify-center ig:gap-2.5 ig:rounded-[12px] ig:border-none ig:bg-[var(--ed-bg-surface)] ig:py-10 ig:text-[var(--ed-text-secondary)] ig:shadow-[0_0_0_1px_var(--ed-border)] ig:transition-colors ig:hover:bg-[var(--ed-bg-hover)] ig:disabled:cursor-default"
        >
          <ImagePlus size={17} />
          添加图片到图册
        </button>
      )}
      <Dialog
        open={!!editing && !readOnly}
        onOpenChange={(next) => !next && setEditing(null)}
        title="编辑图册"
        width={720}
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditing(null)}
            >
              取消
            </Button>
            <Button variant="primary" size="sm" onClick={save}>
              确定
            </Button>
          </>
        }
      >
        <DialogBody>
          {editing && (
            <GallerySettings setting={editing} onSettingChange={setEditing} />
          )}
        </DialogBody>
      </Dialog>
    </div>
    </div>
  );
}
