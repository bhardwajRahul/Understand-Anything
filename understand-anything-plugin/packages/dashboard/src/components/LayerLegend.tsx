import { useDashboardStore } from "../store";

// Shared layer color palette — used by both LayerLegend dots and GraphView group nodes
export const LAYER_PALETTE = [
  { bg: "rgba(74, 124, 155, 0.12)", border: "rgba(74, 124, 155, 0.4)", label: "#4a7c9b" },   // blue (API)
  { bg: "rgba(90, 158, 111, 0.12)", border: "rgba(90, 158, 111, 0.4)", label: "#5a9e6f" },   // green (Data)
  { bg: "rgba(139, 111, 176, 0.12)", border: "rgba(139, 111, 176, 0.4)", label: "#8b6fb0" }, // purple (Service)
  { bg: "rgba(201, 160, 108, 0.12)", border: "rgba(201, 160, 108, 0.4)", label: "#c9a06c" }, // gold (Config)
  { bg: "rgba(176, 122, 138, 0.12)", border: "rgba(176, 122, 138, 0.4)", label: "#b07a8a" }, // pink (UI)
  { bg: "rgba(74, 155, 140, 0.12)", border: "rgba(74, 155, 140, 0.4)", label: "#4a9b8c" },   // teal (Middleware)
  { bg: "rgba(120, 130, 145, 0.12)", border: "rgba(120, 130, 145, 0.4)", label: "#788291" }, // slate (Test)
];

export function getLayerColor(index: number) {
  return LAYER_PALETTE[index % LAYER_PALETTE.length];
}

export default function LayerLegend() {
  const graph = useDashboardStore((s) => s.graph);
  const showLayers = useDashboardStore((s) => s.showLayers);
  const toggleLayers = useDashboardStore((s) => s.toggleLayers);

  const layers = graph?.layers ?? [];
  const hasLayers = layers.length > 0;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleLayers}
        disabled={!hasLayers}
        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
          showLayers && hasLayers
            ? "bg-gold/20 text-gold"
            : hasLayers
              ? "bg-elevated text-text-secondary hover:bg-surface"
              : "bg-elevated text-text-muted cursor-not-allowed"
        }`}
        title={
          hasLayers
            ? showLayers
              ? "Hide layer grouping"
              : "Show layer grouping"
            : "No layers in graph"
        }
      >
        Layers {showLayers && hasLayers ? "ON" : "OFF"}
      </button>

      {showLayers && hasLayers && (
        <div className="flex items-center gap-3">
          {layers.map((layer, i) => {
            const color = getLayerColor(i);
            return (
              <div key={layer.id} className="flex items-center gap-1">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: color.label }}
                />
                <span className="text-text-secondary text-[11px]">
                  {layer.name}
                  <span className="text-text-muted ml-0.5">
                    ({layer.nodeIds.length})
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
