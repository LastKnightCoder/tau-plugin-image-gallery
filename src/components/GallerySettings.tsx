import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Image as ImageIcon, Link, Plus, Upload, X } from "lucide-react";
import {
  Button,
  FormField,
  IconButton,
  Input,
  Menu,
  NumberInput,
  Select,
  Sortable,
  Spinner,
  Switch,
  cn,
} from "@tau/ui";
import { MediaImage, usePluginEnvironment, useResourceUpload } from "@tau/plugins";
import {
  GalleryMode,
  type AppearancePreset,
  type GallerySetting,
  type ImageGalleryItem,
  type LastRowMode,
  type ObjectFitMode,
} from "../types";
import {
  BORDER_RADIUS_OPTIONS,
  SHADOW_OPTIONS,
  normalizeShadow,
} from "../appearance";

interface GallerySettingsProps {
  setting: GallerySetting;
  onSettingChange(setting: GallerySetting): void;
}

interface RangeNumberInputProps {
  id?: string;
  value: number;
  min: number;
  max: number;
  onChange(value: number): void;
}

// 输入过程中只上报区间内的值，失焦时钳回 [min, max]；清空或越界都回落到合法整数
const RangeNumberInput = ({
  id,
  value,
  min,
  max,
  onChange,
}: RangeNumberInputProps) => {
  // 钳位结果与当前值相同时值不变、草稿不会自动同步，换 key 重建以回显合法值
  const [draftKey, setDraftKey] = useState(0);
  const settle = (raw: string) => {
    const parsed = Number(raw);
    const next =
      raw.trim() === "" || Number.isNaN(parsed)
        ? value
        : Math.round(Math.min(max, Math.max(min, parsed)));
    if (next !== value) onChange(next);
    else if (String(next) !== raw.trim()) setDraftKey((key) => key + 1);
  };
  return (
    <NumberInput
      key={draftKey}
      id={id}
      value={value}
      inputMode="numeric"
      onValueChange={(next) => {
        if (next !== null && next >= min && next <= max) onChange(next);
      }}
      onBlur={(event) => settle(event.currentTarget.value)}
    />
  );
};

const SectionTitle = ({
  children,
  extra,
}: {
  children: ReactNode;
  extra?: ReactNode;
}) => (
  <div className="ig:flex ig:items-center ig:gap-3">
    <h3 className="ig:text-ink-3 ig:text-tau-meta ig:font-medium">
      {children}
    </h3>
    <span className="ig:bg-line-1 ig:h-px ig:flex-1" />
    {extra}
  </div>
);

const UPLOAD_TIMEOUT = 10_000;
const withTimeout = <T,>(promise: Promise<T>) =>
  Promise.race([
    promise,
    new Promise<never>((_resolve, reject) =>
      setTimeout(() => reject(new Error("上传超时")), UPLOAD_TIMEOUT),
    ),
  ]);

const MODE_OPTIONS = [
  { value: GalleryMode.Horizontal, label: "横向排版" },
  { value: GalleryMode.Vertical, label: "瀑布流" },
  { value: GalleryMode.Inline, label: "轮播" },
];
const LAST_ROW_OPTIONS: { value: LastRowMode; label: string }[] = [
  { value: "justify", label: "拉伸填充" },
  { value: "nojustify", label: "保持原样" },
  { value: "center", label: "居中对齐" },
  { value: "right", label: "靠右对齐" },
  { value: "hide", label: "隐藏" },
];
const OBJECT_FIT_OPTIONS: { value: ObjectFitMode; label: string }[] = [
  { value: "contain", label: "完整显示" },
  { value: "cover", label: "裁切填满" },
];
const COLUMN_OPTIONS = [2, 3, 4, 5].map((count) => ({
  value: count,
  label: `${count} 列`,
}));

function ImageTile({
  item,
  dragging,
  onDelete,
  touch = false,
}: {
  item: ImageGalleryItem;
  dragging: boolean;
  onDelete(): void;
  touch?: boolean;
}) {
  return (
    <div
      className={cn(
        "ig:bg-surface-hover ig:rounded-tau-md ig:hover:ring-line-2 ig:group ig:relative ig:aspect-square ig:cursor-grab ig:overflow-hidden ig:ring-2 ig:ring-transparent ig:transition-[box-shadow] ig:duration-200",
        dragging && "ig:ring-accent ig:cursor-grabbing",
      )}
    >
      <MediaImage
        url={item.url}
        alt={item.desc || ""}
        draggable={false}
        className="ig:pointer-events-none ig:h-full ig:w-full ig:object-cover"
      />
      <div className="ig:group-hover:bg-overlay/50 ig:pointer-events-none ig:absolute ig:inset-0 ig:transition-colors ig:duration-200" />
      <IconButton
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        aria-label="删除图片"
        title="删除图片"
        className={cn("ig:bg-surface/90 ig:text-ink-2 ig:shadow-float ig:enabled:hover:bg-danger ig:enabled:hover:text-ink-inverse ig:absolute ig:right-1.5 ig:top-1.5 ig:rounded-full ig:focus-visible:opacity-100 ig:group-hover:opacity-100", touch ? "ig:size-10 ig:opacity-100" : "ig:size-6 ig:opacity-0")}
      >
        <X className="ig:size-3.5" />
      </IconButton>
    </div>
  );
}

export function GallerySettings({
  setting,
  onSettingChange,
}: GallerySettingsProps) {
  const touch = usePluginEnvironment().input.touch;
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [progress, setProgress] = useState({ total: 0, success: 0, error: 0 });
  const upload = useResourceUpload();
  // 并发上传逐个完成，回调里要基于最新设置追加
  const settingRef = useRef(setting);
  settingRef.current = setting;

  const patch = (next: Partial<GallerySetting>) =>
    onSettingChange({ ...setting, ...next });

  const addImages = useCallback(
    (urls: string[]) => {
      if (!urls.length || !active.current) return;
      const current = settingRef.current;
      onSettingChange({
        ...current,
        images: [
          ...current.images,
          ...urls.map((url) => ({ id: crypto.randomUUID(), url })),
        ],
      });
    },
    [onSettingChange],
  );

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length || !upload) return;
      setUploading(true);
      setProgress({ total: files.length, success: 0, error: 0 });
      const results = await Promise.all(
        files.map((file) =>
          withTimeout(upload(file)).then(
            (url) => {
              if (!active.current) return null;
              setProgress((value) => ({
                ...value,
                success: value.success + 1,
              }));
              return url;
            },
            () => {
              if (active.current) setProgress((value) => ({ ...value, error: value.error + 1 }));
              return null;
            },
          ),
        ),
      );
      addImages(results.filter((url): url is string => !!url));
      if (active.current) setUploading(false);
    },
    [upload, addImages],
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = [...(event.clipboardData?.items ?? [])]
        .filter((item) => item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter((file): file is File => !!file);
      if (!files.length || !upload) return;
      event.preventDefault();
      void uploadFiles(files);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [uploadFiles, upload]);

  const closeLinkInput = () => {
    setLinkUrl("");
    setShowLinkInput(false);
  };
  const addLink = () => {
    if (!linkUrl.trim()) return;
    addImages([linkUrl.trim()]);
    closeLinkInput();
  };

  const moveImage = (from: number, to: number) => {
    const images = [...setting.images];
    const [moved] = images.splice(from, 1);
    images.splice(to, 0, moved);
    patch({ images });
  };

  return (
    <div className="ig:flex ig:flex-col ig:gap-6">
      <FormField label="显示模式">
        {(field) => (
          <Select
            id={field.id}
            value={setting.mode}
            options={MODE_OPTIONS}
            onValueChange={(mode) => patch({ mode })}
          />
        )}
      </FormField>

      <section className="ig:flex ig:flex-col ig:gap-4">
        <SectionTitle>基础设置</SectionTitle>
        <div className="ig:grid ig:grid-cols-2 ig:gap-4">
          {setting.mode === GalleryMode.Horizontal && (
            <>
              <FormField label="图片高度">
                {(field) => (
                  <RangeNumberInput
                    id={field.id}
                    value={setting.height || 200}
                    onChange={(height) => patch({ height })}
                    min={100}
                    max={400}
                  />
                )}
              </FormField>
              <FormField label="图片间距">
                {(field) => (
                  <RangeNumberInput
                    id={field.id}
                    value={setting.margins ?? 8}
                    onChange={(margins) => patch({ margins })}
                    min={0}
                    max={32}
                  />
                )}
              </FormField>
              <div className="ig:col-span-2">
                <FormField label="最后一行">
                  {(field) => (
                    <Select
                      id={field.id}
                      value={setting.lastRow || "nojustify"}
                      options={LAST_ROW_OPTIONS}
                      onValueChange={(lastRow) => patch({ lastRow })}
                    />
                  )}
                </FormField>
              </div>
            </>
          )}
          {setting.mode === GalleryMode.Vertical && (
            <FormField label="列数">
              {(field) => (
                <Select
                  id={field.id}
                  value={setting.columnCount || 3}
                  options={COLUMN_OPTIONS}
                  onValueChange={(columnCount) => patch({ columnCount })}
                />
              )}
            </FormField>
          )}
          {setting.mode === GalleryMode.Inline && (
            <div className="ig:col-span-2">
              <FormField label="图片显示">
                {(field) => (
                  <Select
                    id={field.id}
                    value={setting.objectFit || "contain"}
                    options={OBJECT_FIT_OPTIONS}
                    onValueChange={(objectFit) => patch({ objectFit })}
                  />
                )}
              </FormField>
            </div>
          )}
        </div>
        <Switch
          label="更宽显示"
          checked={setting.wider || false}
          onCheckedChange={(wider) => patch({ wider })}
        />
      </section>

      <section className="ig:flex ig:flex-col ig:gap-4">
        <SectionTitle>外观设置</SectionTitle>
        <div className="ig:grid ig:grid-cols-2 ig:gap-4">
          <FormField label="圆角">
            {(field) => (
              <Select<AppearancePreset>
                id={field.id}
                value={setting.borderRadius || "none"}
                options={BORDER_RADIUS_OPTIONS}
                onValueChange={(borderRadius) => patch({ borderRadius })}
              />
            )}
          </FormField>
          <FormField label="阴影">
            {(field) => (
              <Select<AppearancePreset>
                id={field.id}
                value={normalizeShadow(setting.shadow)}
                options={SHADOW_OPTIONS}
                onValueChange={(shadow) => patch({ shadow })}
              />
            )}
          </FormField>
        </div>
      </section>

      <section className="ig:flex ig:flex-col ig:gap-4">
        <SectionTitle
          extra={
            <span className="ig:text-ink-3 ig:text-tau-meta">
              {setting.images.length} 张图片
            </span>
          }
        >
          图片管理
        </SectionTitle>

        {uploading && (
          <div
            role="status"
            className="ig:bg-accent-soft ig:rounded-tau-md ig:flex ig:items-center ig:gap-3 ig:px-4 ig:py-3"
          >
            <Spinner className="ig:size-5" />
            <div className="ig:flex-1">
              <div className="ig:text-accent-text ig:text-tau-body ig:font-medium">
                上传中…
              </div>
              <div className="ig:text-ink-2 ig:text-tau-meta">
                成功 {progress.success} / 失败 {progress.error} / 总计{" "}
                {progress.total}
              </div>
            </div>
          </div>
        )}

        {showLinkInput && (
          <div className="ig:flex ig:items-center ig:gap-2">
            <Input
              autoFocus
              type="url"
              lead={Link}
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="输入图片 URL"
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === "Enter") {
                  event.preventDefault();
                  addLink();
                } else if (event.key === "Escape") {
                  // 阻止默认后弹窗不再消费这次 Esc，只收起输入行
                  event.preventDefault();
                  closeLinkInput();
                }
              }}
            />
            <Button
              variant="primary"
              disabled={!linkUrl.trim()}
              onClick={addLink}
            >
              添加
            </Button>
            <Button variant="ghost" onClick={closeLinkInput}>
              取消
            </Button>
          </div>
        )}

        <input
          ref={uploadRef}
          type="file"
          multiple
          accept="image/*"
          className="ig:hidden"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            void uploadFiles(files);
          }}
        />
        <div className="ig:grid ig:grid-cols-2 ig:gap-3 ig:sm:grid-cols-4">
          <Menu
            trigger={
              <button
                type="button"
                disabled={uploading}
                className={cn(
                  "ig:border-line-2 ig:bg-surface-hover ig:text-ink-3 ig:rounded-tau-md ig:group ig:flex ig:aspect-square ig:w-full ig:cursor-pointer ig:flex-col ig:items-center ig:justify-center ig:gap-2 ig:border-2 ig:border-dashed ig:outline-none",
                  "ig:ease-tau-out ig:transition-colors ig:duration-200 ig:focus-visible:shadow-[var(--tau-focus-ring)]",
                  "ig:enabled:hover:border-accent ig:enabled:hover:bg-accent-soft ig:enabled:hover:text-accent-text",
                  "ig:aria-expanded:border-accent ig:aria-expanded:bg-accent-soft ig:aria-expanded:text-accent-text",
                  "ig:disabled:cursor-not-allowed ig:disabled:opacity-50",
                )}
              >
                <span className="ig:bg-surface ig:grid ig:size-10 ig:place-items-center ig:rounded-full">
                  <Plus className="ig:size-5" />
                </span>
                <span className="ig:text-tau-meta">添加图片</span>
              </button>
            }
          >
            {upload && (
              <Menu.Item
                icon={<Upload />}
                onSelect={() => uploadRef.current?.click()}
              >
                上传图片
              </Menu.Item>
            )}
            <Menu.Item icon={<Link />} onSelect={() => setShowLinkInput(true)}>
              输入链接
            </Menu.Item>
          </Menu>
          {touch ? setting.images.map((item, index) => (
            <div key={item.id} aria-label={item.desc || `图片 ${index + 1}`}>
              <ImageTile item={item} dragging={false} touch onDelete={() => patch({ images: setting.images.filter(image => image.id !== item.id) })} />
              <div className="ig:mt-2 ig:flex ig:gap-2">
                <Button size="sm" variant="secondary" disabled={index === 0} aria-label={`前移图片 ${index + 1}`} onClick={() => moveImage(index, index - 1)}>前移</Button>
                <Button size="sm" variant="secondary" disabled={index === setting.images.length - 1} aria-label={`后移图片 ${index + 1}`} onClick={() => moveImage(index, index + 1)}>后移</Button>
              </div>
            </div>
          )) : <Sortable
            className="ig:contents"
            items={setting.images}
            getKey={(item) => item.id}
            onMove={moveImage}
            renderItem={(item, state) => (
              <div {...state.handleProps} aria-label={item.desc || "图片"}>
                <ImageTile
                  item={item}
                  dragging={state.dragging}
                  onDelete={() =>
                    patch({
                      images: setting.images.filter(
                        (image) => image.id !== item.id,
                      ),
                    })
                  }
                />
              </div>
            )}
          />}
        </div>

        {setting.images.length === 0 && !uploading && (
          <div className="ig:flex ig:flex-col ig:items-center ig:justify-center ig:py-8 ig:text-center">
            <div className="ig:bg-surface-hover ig:text-ink-3 ig:mb-4 ig:grid ig:size-16 ig:place-items-center ig:rounded-full">
              <ImageIcon className="ig:size-8" strokeWidth={1.5} />
            </div>
            <p className="ig:text-ink-2 ig:text-tau-body">还没有添加图片</p>
            <p className="ig:text-ink-3 ig:text-tau-meta ig:mt-1">
              点击「添加图片」，或直接粘贴剪贴板里的图片
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
