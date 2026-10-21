import { describe, expect, it } from "vitest";
import { galleryCodec, galleryToHtml } from "../export";
import {
  calculateLayout,
  toImageDimension,
} from "../components/layoutCalculator";

const gallery = (images: { url: string; desc?: string }[]) => ({
  type: "image-gallery",
  mode: 1,
  images: images.map((image, index) => ({ id: String(index), ...image })),
  children: [{ type: "formatted", text: "" }],
});

describe("导出", () => {
  it("Markdown 每张图一行，跳过空地址", () => {
    expect(
      galleryCodec.serializer!.toMarkdown!(
        gallery([{ url: "a.png" }, { url: "" }, { url: "b.png" }]) as never,
        [] as never,
        {} as never,
      ),
    ).toBe("![](a.png)\n![](b.png)");
  });

  it("HTML 内联样式、转义地址与说明，多张时带滑动提示", () => {
    const html = galleryToHtml(
      gallery([{ url: 'a.png" onerror="x', desc: "<夜>" }, { url: "b.png" }]),
    );
    expect(html).toContain('src="a.png&quot; onerror=&quot;x"');
    expect(html).toContain('alt="&lt;夜&gt;"');
    expect(html).toContain("左右滑动查看更多");
    expect(html).not.toContain("class=");
    expect(galleryToHtml(gallery([{ url: "a.png" }]))).not.toContain(
      "左右滑动",
    );
    expect(galleryToHtml(gallery([]))).toBe("");
  });
});

describe("横排布局", () => {
  it("同一行等高并铺满容器宽度", () => {
    const items = [
      { id: "a", url: "a", width: 400, height: 200 },
      { id: "b", url: "b", width: 200, height: 200 },
      { id: "c", url: "c", width: 300, height: 200 },
    ].map((item) => toImageDimension(item, true));
    const layout = calculateLayout(items, 600, {
      rowHeight: 200,
      margins: 0,
      lastRow: "justify",
      justifyThreshold: 0.75,
    });
    const rows = new Map<number, number>();
    for (const item of layout.items)
      rows.set(item.top, (rows.get(item.top) ?? 0) + item.width);
    for (const width of rows.values()) expect(Math.round(width)).toBe(600);
    expect(layout.totalHeight).toBeGreaterThan(0);
  });
});
