import type { CSSProperties } from "react";
import type { AppearancePreset } from "./types";

export const BORDER_RADIUS_OPTIONS: {
  value: AppearancePreset;
  label: string;
}[] = [
  { value: "none", label: "直角" },
  { value: "sm", label: "圆角 8" },
  { value: "md", label: "圆角 12" },
  { value: "lg", label: "圆角 16" },
];

export const SHADOW_OPTIONS: { value: AppearancePreset; label: string }[] = [
  { value: "none", label: "无阴影" },
  { value: "sm", label: "卡片" },
  { value: "md", label: "轻抬" },
  { value: "lg", label: "浮起" },
];

/** 圆角对齐主题尺度，阴影对齐编辑器三档阴影，随主题明暗 */
const RADIUS: Record<AppearancePreset, string> = {
  none: "0",
  sm: "var(--tau-radius-sm)",
  md: "var(--tau-radius-md)",
  lg: "var(--tau-radius-lg)",
};
const SHADOW: Record<AppearancePreset, string | undefined> = {
  none: undefined,
  sm: "var(--ed-shadow-card)",
  md: "var(--ed-shadow-lift)",
  lg: "var(--ed-shadow-float)",
};

/** 旧数据的阴影可能是布尔值：true 视为「轻抬」 */
export const normalizeShadow = (
  shadow?: AppearancePreset | boolean,
): AppearancePreset => (shadow === true ? "md" : !shadow ? "none" : shadow);

export const appearanceStyle = (
  borderRadius?: AppearancePreset,
  shadow?: AppearancePreset | boolean,
): CSSProperties => ({
  borderRadius: RADIUS[borderRadius ?? "none"],
  boxShadow: SHADOW[normalizeShadow(shadow)],
});
