import type { EditorMetricRule } from "@tau/plugins";

export const editorMetrics = [
  {
    type: "image-gallery",
    textFields: [],
  },
] as const satisfies readonly EditorMetricRule[];
