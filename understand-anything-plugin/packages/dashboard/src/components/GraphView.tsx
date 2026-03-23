import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
} from "@xyflow/react";
import type { Edge, Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import CustomNode from "./CustomNode";
import type { CustomFlowNode } from "./CustomNode";
import { useDashboardStore } from "../store";
import { applyDagreLayout, NODE_WIDTH, NODE_HEIGHT } from "../utils/layout";
import { getLayerColor } from "./LayerLegend";

const LAYER_PADDING = 40;

const nodeTypes = { custom: CustomNode };

export default function GraphView() {
  const graph = useDashboardStore((s) => s.graph);
  const selectedNodeId = useDashboardStore((s) => s.selectedNodeId);
  const searchResults = useDashboardStore((s) => s.searchResults);
  const selectNode = useDashboardStore((s) => s.selectNode);
  const openCodeViewer = useDashboardStore((s) => s.openCodeViewer);
  const showLayers = useDashboardStore((s) => s.showLayers);
  const tourHighlightedNodeIds = useDashboardStore((s) => s.tourHighlightedNodeIds);
  const persona = useDashboardStore((s) => s.persona);
  const diffMode = useDashboardStore((s) => s.diffMode);
  const changedNodeIds = useDashboardStore((s) => s.changedNodeIds);
  const affectedNodeIds = useDashboardStore((s) => s.affectedNodeIds);
  const focusNodeId = useDashboardStore((s) => s.focusNodeId);
  const setFocusNode = useDashboardStore((s) => s.setFocusNode);

  const handleNodeSelect = useCallback(
    (nodeId: string) => {
      selectNode(nodeId);
      openCodeViewer(nodeId);
    },
    [selectNode, openCodeViewer],
  );

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!graph)
      return {
        initialNodes: [] as (CustomFlowNode | Node)[],
        initialEdges: [] as Edge[],
      };

    // Filter nodes and edges based on persona
    let filteredGraphNodes =
      persona === "non-technical"
        ? graph.nodes.filter(
            (n) =>
              n.type === "concept" || n.type === "module" || n.type === "file",
          )
        : graph.nodes;

    let filteredNodeIds = new Set(filteredGraphNodes.map((n) => n.id));
    let filteredGraphEdges =
      persona === "non-technical"
        ? graph.edges.filter(
            (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target),
          )
        : graph.edges;

    // Focus mode: filter to 1-hop neighborhood of the focused node
    if (focusNodeId && filteredNodeIds.has(focusNodeId)) {
      const focusNeighborIds = new Set<string>([focusNodeId]);
      for (const edge of filteredGraphEdges) {
        if (edge.source === focusNodeId) focusNeighborIds.add(edge.target);
        if (edge.target === focusNodeId) focusNeighborIds.add(edge.source);
      }
      filteredGraphNodes = filteredGraphNodes.filter((n) => focusNeighborIds.has(n.id));
      filteredNodeIds = new Set(filteredGraphNodes.map((n) => n.id));
      filteredGraphEdges = filteredGraphEdges.filter(
        (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target),
      );
    }

    // Compute neighbor set for selection-based highlighting
    const neighborNodeIds = new Set<string>();
    if (selectedNodeId) {
      for (const edge of filteredGraphEdges) {
        if (edge.source === selectedNodeId) neighborNodeIds.add(edge.target);
        if (edge.target === selectedNodeId) neighborNodeIds.add(edge.source);
      }
      neighborNodeIds.add(selectedNodeId);
    }

    const flowNodes: CustomFlowNode[] = filteredGraphNodes.map((node) => {
      const matchResult = searchResults.find((r) => r.nodeId === node.id);
      const hasSelection = !!selectedNodeId;
      return {
        id: node.id,
        type: "custom" as const,
        position: { x: 0, y: 0 },
        data: {
          label: node.name ?? node.filePath?.split("/").pop() ?? node.id,
          nodeType: node.type,
          summary: node.summary,
          complexity: node.complexity,
          isHighlighted: !!matchResult,
          searchScore: matchResult?.score,
          isSelected: selectedNodeId === node.id,
          isTourHighlighted: tourHighlightedNodeIds.includes(node.id),
          isDiffChanged: diffMode && changedNodeIds.has(node.id),
          isDiffAffected: diffMode && affectedNodeIds.has(node.id),
          isDiffFaded: diffMode && !changedNodeIds.has(node.id) && !affectedNodeIds.has(node.id),
          isNeighbor: hasSelection && neighborNodeIds.has(node.id) && selectedNodeId !== node.id,
          isSelectionFaded: hasSelection && !neighborNodeIds.has(node.id),
          onNodeClick: handleNodeSelect,
        },
      };
    });

    const diffNodeIds = diffMode ? new Set([...changedNodeIds, ...affectedNodeIds]) : new Set<string>();
    const flowEdges: Edge[] = filteredGraphEdges.map((edge, i) => {
      const sourceInDiff = diffMode && diffNodeIds.has(edge.source);
      const targetInDiff = diffMode && diffNodeIds.has(edge.target);
      const isImpacted = diffMode && (sourceInDiff || targetInDiff);

      // Selection-based edge highlighting
      const isSelectedEdge = !!selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId);
      const hasSelection = !!selectedNodeId;

      let edgeStyle: React.CSSProperties;
      let edgeLabelStyle: React.CSSProperties;
      let edgeAnimated: boolean;

      if (isImpacted) {
        edgeStyle = {
          stroke: sourceInDiff && targetInDiff
            ? "rgba(224, 82, 82, 0.7)"
            : "rgba(212, 160, 48, 0.5)",
          strokeWidth: 2.5,
        };
        edgeLabelStyle = { fill: "#a39787", fontSize: 10 };
        edgeAnimated = true;
      } else if (diffMode) {
        edgeStyle = { stroke: "rgba(212,165,116,0.08)", strokeWidth: 1 };
        edgeLabelStyle = { fill: "rgba(163,151,135,0.3)", fontSize: 10 };
        edgeAnimated = false;
      } else if (isSelectedEdge) {
        edgeStyle = { stroke: "rgba(212,165,116,0.8)", strokeWidth: 2.5 };
        edgeLabelStyle = { fill: "#d4a574", fontSize: 11, fontWeight: 600 };
        edgeAnimated = true;
      } else if (hasSelection) {
        edgeStyle = { stroke: "rgba(212,165,116,0.08)", strokeWidth: 1 };
        edgeLabelStyle = { fill: "rgba(163,151,135,0.2)", fontSize: 10 };
        edgeAnimated = false;
      } else {
        edgeStyle = { stroke: "rgba(212,165,116,0.3)", strokeWidth: 1.5 };
        edgeLabelStyle = { fill: "#a39787", fontSize: 10 };
        edgeAnimated = edge.type === "calls";
      }

      return {
        id: `e-${i}`,
        source: edge.source,
        target: edge.target,
        label: edge.type,
        animated: edgeAnimated,
        style: edgeStyle,
        labelStyle: edgeLabelStyle,
      };
    });

    // Run dagre layout on all nodes (without groups)
    const laid = applyDagreLayout(flowNodes, flowEdges);
    const laidNodes = laid.nodes as CustomFlowNode[];

    const layers = graph.layers ?? [];
    if (!showLayers || layers.length === 0) {
      return { initialNodes: laidNodes, initialEdges: laid.edges };
    }

    // Build a map of nodeId -> layer for quick lookup
    const nodeToLayer = new Map<string, string>();
    for (const layer of layers) {
      for (const nodeId of layer.nodeIds) {
        nodeToLayer.set(nodeId, layer.id);
      }
    }

    // Create group nodes and adjust member positions
    const groupNodes: Node[] = [];
    const adjustedNodes: (CustomFlowNode | Node)[] = [];

    for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
      const layer = layers[layerIdx];
      const memberNodes = laidNodes.filter((n) =>
        layer.nodeIds.includes(n.id),
      );

      if (memberNodes.length === 0) continue;

      // Compute bounding box around member nodes
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const node of memberNodes) {
        const x = node.position.x;
        const y = node.position.y;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + NODE_WIDTH);
        maxY = Math.max(maxY, y + NODE_HEIGHT);
      }

      // Group node position = top-left with padding
      const groupX = minX - LAYER_PADDING;
      const groupY = minY - LAYER_PADDING - 24; // extra space for label
      const groupWidth = maxX - minX + LAYER_PADDING * 2;
      const groupHeight = maxY - minY + LAYER_PADDING * 2 + 24;

      // Create the group node with distinct color per layer
      const layerColor = getLayerColor(layerIdx);
      groupNodes.push({
        id: layer.id,
        type: "group",
        position: { x: groupX, y: groupY },
        data: { label: layer.name },
        style: {
          width: groupWidth,
          height: groupHeight,
          backgroundColor: layerColor.bg,
          borderRadius: 12,
          border: `2px solid ${layerColor.border}`,
          padding: 8,
          fontSize: 13,
          fontWeight: 600,
          color: layerColor.label,
        },
      });

      // Adjust member node positions to be relative to the group
      for (const node of memberNodes) {
        adjustedNodes.push({
          ...node,
          parentId: layer.id,
          extent: "parent" as const,
          position: {
            x: node.position.x - groupX,
            y: node.position.y - groupY,
          },
        });
      }
    }

    // Add nodes that are not in any layer (keep original positions)
    for (const node of laidNodes) {
      if (!nodeToLayer.has(node.id)) {
        adjustedNodes.push(node);
      }
    }

    // Group nodes must come before their children in the array
    const allNodes: (CustomFlowNode | Node)[] = [
      ...groupNodes,
      ...adjustedNodes,
    ];

    return { initialNodes: allNodes, initialEdges: laid.edges };
  }, [graph, searchResults, selectedNodeId, showLayers, tourHighlightedNodeIds, persona, handleNodeSelect, diffMode, changedNodeIds, affectedNodeIds, focusNodeId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const { fitView } = useReactFlow();

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Zoom-to-node when navigateToNode is called
  const zoomToNodeId = useDashboardStore((s) => s.zoomToNodeId);
  useEffect(() => {
    if (zoomToNodeId) {
      // Small delay to let React Flow update node positions first
      const timer = setTimeout(() => {
        fitView({ nodes: [{ id: zoomToNodeId }], duration: 400, padding: 0.5 });
        useDashboardStore.setState({ zoomToNodeId: null });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [zoomToNodeId, fitView]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      // Ignore clicks on group nodes
      const isGroupNode = graph?.layers?.some((l) => l.id === node.id);
      if (isGroupNode) return;
      selectNode(node.id);
      openCodeViewer(node.id);
    },
    [selectNode, openCodeViewer, graph],
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  if (!graph) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-root rounded-lg">
        <p className="text-text-muted text-sm">No knowledge graph loaded</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      {focusNodeId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={() => setFocusNode(null)}
            className="px-4 py-2 rounded-full bg-elevated border border-gold/30 text-gold text-xs font-semibold tracking-wider uppercase hover:bg-gold/10 transition-colors flex items-center gap-2 shadow-lg"
          >
            <span>Showing neighborhood</span>
            <span className="text-text-muted">&times;</span>
          </button>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.05}
        maxZoom={4}
        panOnScroll
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} color="rgba(212,165,116,0.15)" gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor="#1a1a1a"
          maskColor="rgba(10,10,10,0.7)"
          className="!bg-surface !border !border-border-subtle"
        />
      </ReactFlow>
    </div>
  );
}
