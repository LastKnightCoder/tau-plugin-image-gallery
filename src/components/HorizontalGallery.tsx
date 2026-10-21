import { useEffect, useMemo, useRef, useState } from "react";
import { MediaImage } from "@tau/plugins";
import type { AppearancePreset, ImageGalleryItem, LastRowMode } from "../types";
import {
  calculateLayout,
  toImageDimension,
  DEFAULT_CONFIG,
  type ImageDimension,
} from "./layoutCalculator";
import { appearanceStyle } from "../appearance";

interface HorizontalGalleryProps {
  items: ImageGalleryItem[];
  height?: number;
  margins?: number;
  lastRow?: LastRowMode;
  borderRadius?: AppearancePreset;
  shadow?: AppearancePreset | boolean;
  onUpdateDimensions?: (items: ImageGalleryItem[]) => void;
  /** 单击 / 双击某张图，参数为该图在 items 中的序号 */
  onItemClick?: (index: number) => void;
  onItemDoubleClick?: (index: number) => void;
}

const HorizontalGallery = (props: HorizontalGalleryProps) => {
  const {
    items,
    height = DEFAULT_CONFIG.rowHeight,
    margins = DEFAULT_CONFIG.margins,
    lastRow = DEFAULT_CONFIG.lastRow,
    borderRadius = "none",
    shadow = false,
    onUpdateDimensions,
    onItemClick,
    onItemDoubleClick,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [dimensions, setDimensions] = useState<Map<string, ImageDimension>>(
    new Map(),
  );

  // 监听容器宽度变化
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(containerRef.current);
    setContainerWidth(containerRef.current.offsetWidth);

    return () => observer.disconnect();
  }, []);

  // 加载图片尺寸
  useEffect(() => {
    const newDimensions = new Map<string, ImageDimension>();
    const needsUpdate: ImageGalleryItem[] = [];

    items.forEach((item) => {
      // 优先使用已存储的尺寸
      if (item.width && item.height) {
        newDimensions.set(item.id, toImageDimension(item, true));
        return;
      }

      // 检查是否已经加载过
      const existing = dimensions.get(item.id);
      if (existing?.loaded) {
        newDimensions.set(item.id, existing);
        return;
      }

      // 需要动态加载
      newDimensions.set(item.id, toImageDimension(item, false));

      const img = new Image();
      img.onload = () => {
        setDimensions((prev) => {
          const next = new Map(prev);
          const dimension: ImageDimension = {
            id: item.id,
            url: item.url,
            desc: item.desc,
            width: img.naturalWidth,
            height: img.naturalHeight,
            aspectRatio: img.naturalWidth / img.naturalHeight,
            loaded: true,
          };
          next.set(item.id, dimension);
          return next;
        });

        // 收集需要更新的项目
        needsUpdate.push({
          ...item,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });

        // 延迟调用回调，避免频繁更新
        if (onUpdateDimensions && needsUpdate.length > 0) {
          requestAnimationFrame(() => {
            const updatedItems = items.map((i) => {
              const updated = needsUpdate.find((u) => u.id === i.id);
              return updated || i;
            });
            onUpdateDimensions(updatedItems);
          });
        }
      };

      img.onerror = () => {
        setDimensions((prev) => {
          const next = new Map(prev);
          next.set(item.id, {
            ...toImageDimension(item, false),
            loaded: false,
          });
          return next;
        });
      };

      img.src = item.url;
    });

    setDimensions(newDimensions);
  }, [items]);

  // 获取尺寸数组
  const dimensionsArray = useMemo(() => {
    return items.map((item) => {
      const dim = dimensions.get(item.id);
      if (dim) return dim;
      return toImageDimension(item, false);
    });
  }, [items, dimensions]);

  // 计算布局
  const layout = useMemo(() => {
    if (containerWidth <= 0) {
      return { items: [], totalHeight: 0 };
    }
    return calculateLayout(dimensionsArray, containerWidth, {
      rowHeight: height,
      margins,
      lastRow,
      justifyThreshold: DEFAULT_CONFIG.justifyThreshold,
    });
  }, [dimensionsArray, containerWidth, height, margins, lastRow]);

  const indexOf = (id: string) => items.findIndex((item) => item.id === id);

  // 检查是否所有图片都已加载
  const allLoaded = dimensionsArray.every((d) => d.loaded);
  const itemAppearanceStyle = useMemo(
    () => appearanceStyle(borderRadius, shadow),
    [borderRadius, shadow],
  );

  return (
    <div
      ref={containerRef}
      className="ig:relative ig:w-full"
      style={{ height: layout.totalHeight > 0 ? layout.totalHeight : "auto" }}
    >
      {layout.items.map((item) => (
        <div
          key={item.id}
          className="ig:absolute ig:cursor-pointer ig:overflow-hidden"
          style={{
            width: item.width,
            height: item.height,
            top: item.top,
            left: item.left,
            ...itemAppearanceStyle,
          }}
          onClick={() => onItemClick?.(indexOf(item.id))}
          onDoubleClick={() => onItemDoubleClick?.(indexOf(item.id))}
        >
          <MediaImage
            url={item.url}
            alt={item.desc || ""}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
            }}
          />
        </div>
      ))}

      {/* 加载占位符 */}
      {!allLoaded && layout.items.length === 0 && (
        <div
          className="ig:h-48 ig:animate-pulse ig:rounded-[var(--tau-radius-sm)] ig:bg-[var(--ed-bg-hover)]"
          aria-label="图片加载中"
        />
      )}
    </div>
  );
};

export default HorizontalGallery;
