import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { GallerySettings } from "../components/GallerySettings";
import { GalleryMode, type GallerySetting } from "../types";

const fixture = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock("@tau/plugins", () => ({
  usePluginEnvironment: () => ({ input: { coarsePointer: true } }),
  useResourceUpload: () => fixture.upload,
  MediaImage: ({ url, ...props }: any) => <img src={url} {...props} />,
}));
vi.mock("@tau/ui", () => {
  const Button = ({ children, variant: _variant, size: _size, ...props }: any) => <button {...props}>{children}</button>;
  const Menu = Object.assign(({ trigger, children }: any) => <div>{trigger}{children}</div>, { Item: ({ onSelect, children }: any) => <button onClick={onSelect}>{children}</button> });
  return {
    Button, IconButton: Button, Menu,
    FormField: ({ label, children }: any) => <label>{label}{children({ id: label })}</label>,
    Input: (props: any) => <input {...props} />,
    NumberInput: ({ onValueChange, ...props }: any) => <input {...props} onChange={event => onValueChange?.(event.target.value)} />,
    Select: ({ options, onValueChange, ...props }: any) => <select {...props} onChange={event => onValueChange(event.target.value)}>{options.map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>,
    Switch: ({ checked, onCheckedChange }: any) => <input type="checkbox" checked={checked} onChange={event => onCheckedChange?.(event.target.checked)} />,
    Sortable: () => { throw new Error("触摸排序不得依赖拖拽"); },
    Spinner: () => <span />,
    cn: (...values: unknown[]) => values.filter(value => typeof value === "string").join(" "),
  };
});
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const initial = { mode: GalleryMode.Horizontal, images: [{ id: "a", url: "data:,a" }, { id: "b", url: "data:,b" }] } as GallerySetting;
afterEach(async () => { await act(async () => root?.unmount()); host?.remove(); vi.clearAllMocks(); });

it("触摸端可用按钮排序和删除，不依赖拖拽或悬停", async () => {
  const changed = vi.fn();
  function Harness() {
    const [setting, setSetting] = useState(initial);
    return <GallerySettings setting={setting} onSettingChange={value => { changed(value); setSetting(value); }} />;
  }
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(<Harness />));
  const next = host.querySelector<HTMLButtonElement>('[aria-label="后移图片 1"]')!;
  await act(async () => next.click());
  expect(changed.mock.lastCall?.[0].images.map((image: { id: string }) => image.id)).toEqual(["b", "a"]);
  const remove = host.querySelector<HTMLButtonElement>('[aria-label="删除图片"]')!;
  expect(remove.className).toContain("ig:opacity-100");
  await act(async () => remove.click());
  expect(changed.mock.lastCall?.[0].images.map((image: { id: string }) => image.id)).toEqual(["a"]);
});

it("关闭图册编辑后上传迟到结果不重开编辑或改写草稿", async () => {
  let complete: (url: string) => void = () => {};
  fixture.upload.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  const changed = vi.fn();
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(<GallerySettings setting={initial} onSettingChange={changed} />));
  const input = host.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, "files", { value: [new File(["image"], "test.png", { type: "image/png" })] });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
  expect(fixture.upload).toHaveBeenCalledOnce();
  await act(async () => root.unmount());
  await act(async () => complete("data:,late"));
  expect(changed).not.toHaveBeenCalled();
});
