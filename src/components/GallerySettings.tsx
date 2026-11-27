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
import {
  MediaImage,
  useI18n,
  usePluginEnvironment,
  useResourceUpload,
} from "@tau/plugins";
import {
  GalleryMode,
  type AppearancePreset,
  type GallerySetting,
  type ImageGalleryItem,
  type LastRowMode,
  type ObjectFitMode,
} from "../types";
import { normalizeShadow } from "../appearance";
import { messages, type MessageKey } from "../i18n";

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

const MODE_OPTIONS: { value: GalleryMode; label: MessageKey }[] = [
  { value: GalleryMode.Horizontal, label: "settings.mode.horizontal" },
  { value: GalleryMode.Vertical, label: "settings.mode.vertical" },
  { value: GalleryMode.Inline, label: "settings.mode.carousel" },
];
const LAST_ROW_OPTIONS: { value: LastRowMode; label: MessageKey }[] = [
  { value: "justify", label: "settings.lastRow.justify" },
  { value: "nojustify", label: "settings.lastRow.nojustify" },
  { value: "center", label: "settings.lastRow.center" },
  { value: "right", label: "settings.lastRow.right" },
  { value: "hide", label: "settings.lastRow.hide" },
];
const OBJECT_FIT_OPTIONS: { value: ObjectFitMode; label: MessageKey }[] = [
  { value: "contain", label: "settings.objectFit.contain" },
  { value: "cover", label: "settings.objectFit.cover" },
];
const RADIUS_LABELS: Record<AppearancePreset, MessageKey> = {
  none: "settings.radius.none",
  sm: "settings.radius.sm",
  md: "settings.radius.md",
  lg: "settings.radius.lg",
};
const SHADOW_LABELS: Record<AppearancePreset, MessageKey> = {
  none: "settings.shadow.none",
  sm: "settings.shadow.sm",
  md: "settings.shadow.md",
  lg: "settings.shadow.lg",
};

function ImageTile({
  item,
  dragging,
  onDelete,
  coarsePointer = false,
}: {
  item: ImageGalleryItem;
  dragging: boolean;
  onDelete(): void;
  coarsePointer?: boolean;
}) {
  const { t } = useI18n(messages);
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
        aria-label={t("images.delete")}
        title={t("images.delete")}
        className={cn("ig:bg-surface/90 ig:text-ink-2 ig:shadow-float ig:enabled:hover:bg-danger ig:enabled:hover:text-ink-inverse ig:absolute ig:right-1.5 ig:top-1.5 ig:rounded-full ig:focus-visible:opacity-100 ig:group-hover:opacity-100", coarsePointer ? "ig:size-10 ig:opacity-100" : "ig:size-6 ig:opacity-0")}
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
  const { t } = useI18n(messages);
  const { coarsePointer, finePointer } = usePluginEnvironment().input;
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
  const moveControls = (index: number) => (
    <div className="ig:mt-2 ig:flex ig:gap-2">
      <Button size="sm" variant="secondary" disabled={index === 0} aria-label={t("images.moveBack.aria", { position: index + 1 })} onClick={() => moveImage(index, index - 1)}>{t("images.moveBack")}</Button>
      <Button size="sm" variant="secondary" disabled={index === setting.images.length - 1} aria-label={t("images.moveForward.aria", { position: index + 1 })} onClick={() => moveImage(index, index + 1)}>{t("images.moveForward")}</Button>
    </div>
  );

  return (
    <div className="ig:flex ig:flex-col ig:gap-6">
      <FormField label={t("settings.mode")}>
        {(field) => (
          <Select
            id={field.id}
            value={setting.mode}
            options={MODE_OPTIONS.map(({ value, label }) => ({ value, label: t(label) }))}
            onValueChange={(mode) => patch({ mode })}
          />
        )}
      </FormField>

      <section className="ig:flex ig:flex-col ig:gap-4">
        <SectionTitle>{t("settings.section.basic")}</SectionTitle>
        <div className="ig:grid ig:grid-cols-2 ig:gap-4">
          {setting.mode === GalleryMode.Horizontal && (
            <>
              <FormField label={t("settings.imageHeight")}>
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
              <FormField label={t("settings.imageSpacing")}>
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
                <FormField label={t("settings.lastRow")}>
                  {(field) => (
                    <Select
                      id={field.id}
                      value={setting.lastRow || "nojustify"}
                      options={LAST_ROW_OPTIONS.map(({ value, label }) => ({ value, label: t(label) }))}
                      onValueChange={(lastRow) => patch({ lastRow })}
                    />
                  )}
                </FormField>
              </div>
            </>
          )}
          {setting.mode === GalleryMode.Vertical && (
            <FormField label={t("settings.columns")}>
              {(field) => (
                <Select
                  id={field.id}
                  value={setting.columnCount || 3}
                  options={[2, 3, 4, 5].map((count) => ({
                    value: count,
                    label: t("settings.columnCount", { count }),
                  }))}
                  onValueChange={(columnCount) => patch({ columnCount })}
                />
              )}
            </FormField>
          )}
          {setting.mode === GalleryMode.Inline && (
            <div className="ig:col-span-2">
              <FormField label={t("settings.objectFit")}>
                {(field) => (
                  <Select
                    id={field.id}
                    value={setting.objectFit || "contain"}
                    options={OBJECT_FIT_OPTIONS.map(({ value, label }) => ({ value, label: t(label) }))}
                    onValueChange={(objectFit) => patch({ objectFit })}
                  />
                )}
              </FormField>
            </div>
          )}
        </div>
        <Switch
          label={t("settings.wider")}
          checked={setting.wider || false}
          onCheckedChange={(wider) => patch({ wider })}
        />
      </section>

      <section className="ig:flex ig:flex-col ig:gap-4">
        <SectionTitle>{t("settings.section.appearance")}</SectionTitle>
        <div className="ig:grid ig:grid-cols-2 ig:gap-4">
          <FormField label={t("settings.radius")}>
            {(field) => (
              <Select<AppearancePreset>
                id={field.id}
                value={setting.borderRadius || "none"}
                options={(Object.keys(RADIUS_LABELS) as AppearancePreset[]).map((value) => ({
                  value,
                  label: t(RADIUS_LABELS[value]),
                }))}
                onValueChange={(borderRadius) => patch({ borderRadius })}
              />
            )}
          </FormField>
          <FormField label={t("settings.shadow")}>
            {(field) => (
              <Select<AppearancePreset>
                id={field.id}
                value={normalizeShadow(setting.shadow)}
                options={(Object.keys(SHADOW_LABELS) as AppearancePreset[]).map((value) => ({
                  value,
                  label: t(SHADOW_LABELS[value]),
                }))}
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
              {t("settings.imagesCount", { count: setting.images.length })}
            </span>
          }
        >
          {t("settings.section.images")}
        </SectionTitle>

        {uploading && (
          <div
            role="status"
            className="ig:bg-accent-soft ig:rounded-tau-md ig:flex ig:items-center ig:gap-3 ig:px-4 ig:py-3"
          >
            <Spinner className="ig:size-5" />
            <div className="ig:flex-1">
              <div className="ig:text-accent-text ig:text-tau-body ig:font-medium">
                {t("upload.inProgress")}
              </div>
              <div className="ig:text-ink-2 ig:text-tau-meta">
                {t("upload.progress", {
                  success: progress.success,
                  error: progress.error,
                  total: progress.total,
                })}
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
              placeholder={t("images.urlPlaceholder")}
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
              {t("link.add")}
            </Button>
            <Button variant="ghost" onClick={closeLinkInput}>
              {t("action.cancel")}
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
                <span className="ig:text-tau-meta">{t("images.add")}</span>
              </button>
            }
          >
            {upload && (
              <Menu.Item
                icon={<Upload />}
                onSelect={() => uploadRef.current?.click()}
              >
                {t("images.upload")}
              </Menu.Item>
            )}
            <Menu.Item icon={<Link />} onSelect={() => setShowLinkInput(true)}>
              {t("images.enterLink")}
            </Menu.Item>
          </Menu>
          {!finePointer ? setting.images.map((item, index) => (
            <div key={item.id} aria-label={item.desc || t("images.aria.numbered", { position: index + 1 })}>
              <ImageTile item={item} dragging={false} coarsePointer={coarsePointer} onDelete={() => patch({ images: setting.images.filter(image => image.id !== item.id) })} />
              {moveControls(index)}
            </div>
          )) : <Sortable
            className="ig:contents"
            items={setting.images}
            getKey={(item) => item.id}
            onMove={moveImage}
            renderItem={(item, state) => (
              <div aria-label={item.desc || t("images.aria")}>
                <div {...state.handleProps}>
                <ImageTile
                  item={item}
                  dragging={state.dragging}
                  coarsePointer={coarsePointer}
                  onDelete={() =>
                    patch({
                      images: setting.images.filter(
                        (image) => image.id !== item.id,
                      ),
                    })
                  }
                />
                </div>
                {moveControls(setting.images.findIndex(image => image.id === item.id))}
              </div>
            )}
          />}
        </div>

        {setting.images.length === 0 && !uploading && (
          <div className="ig:flex ig:flex-col ig:items-center ig:justify-center ig:py-8 ig:text-center">
            <div className="ig:bg-surface-hover ig:text-ink-3 ig:mb-4 ig:grid ig:size-16 ig:place-items-center ig:rounded-full">
              <ImageIcon className="ig:size-8" strokeWidth={1.5} />
            </div>
            <p className="ig:text-ink-2 ig:text-tau-body">{t("images.empty.title")}</p>
            <p className="ig:text-ink-3 ig:text-tau-meta ig:mt-1">
              {t("images.empty.hint")}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
