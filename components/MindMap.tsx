
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MindMapNodeData, NodePosition } from '../types';
import { Icon } from './Icon';

const NODE_WIDTH = 240;
const NODE_HEIGHT_BASE = 80; // Base height
const HORIZONTAL_SPACING = 100; // Space between parent and child layers
const VERTICAL_SPACING = 20;    // Space between sibling nodes

// "Tech" palette - High contrast, distinct
const BRANCH_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#ef4444', // Red
  '#6366f1', // Indigo
];

const getBranchColor = (index: number) => BRANCH_COLORS[index % BRANCH_COLORS.length];

const estimateNodeHeight = (node: MindMapNodeData, isCollapsed: boolean): number => {
    if (isCollapsed) return NODE_HEIGHT_BASE;

    // Approximate height calculation
    // Header: ~40px
    // Padding: ~24px (12px top + 12px bottom)
    // Topic: ~20px per line (bold)
    // Content: ~16px per line (small)
    
    const charsPerLineTopic = 25; // Approx chars for topic width
    const charsPerLineContent = 35; // Approx chars for content width
    
    const topicLines = Math.ceil(node.topic.length / charsPerLineTopic) || 1;
    const contentLines = node.content ? Math.ceil(node.content.length / charsPerLineContent) : 0;
    
    // Base structure height (Header + Padding + Spacing)
    let height = 50 + (topicLines * 20); 
    
    if (contentLines > 0) {
        height += (contentLines * 16) + 10; // +10 for gap
    }
    
    // Min height
    return Math.max(NODE_HEIGHT_BASE, height);
};

interface ExtendedNodePosition extends Omit<NodePosition, 'children'> {
    color?: string;
    depth: number;
    treeHeight: number; 
    height: number; // Actual node height
    children: ExtendedNodePosition[];
    isCollapsed?: boolean;
    hasHiddenChildren?: boolean;
    hiddenChildrenCount?: number;
}

// --- Components ---

const MindMapNode: React.FC<{ 
  node: ExtendedNodePosition; 
  isHighlighted: boolean; 
  isSelected: boolean;
  isSearchMatch: boolean;
  onHover: (id: string | null) => void;
  onToggle: (id: string) => void;
  onClick: (node: ExtendedNodePosition) => void;
}> = ({ node, isHighlighted, isSelected, isSearchMatch, onHover, onToggle, onClick }) => {
  
  const isRoot = node.depth === 0;
  const accentColor = node.color || 'var(--color-border)';
  
  return (
    <g 
        transform={`translate(${node.x}, ${node.y})`} 
        onMouseEnter={() => onHover(node.id)}
        onMouseLeave={() => onHover(null)}
        onClick={(e) => {
            e.stopPropagation();
            onClick(node);
        }}
        className="group cursor-pointer"
        style={{ opacity: isSearchMatch ? 1 : ((isHighlighted || isSelected) ? 1 : 1) }}
    >
      <foreignObject width={NODE_WIDTH} height={node.height} className="overflow-visible pointer-events-auto">
        <div 
            className={`
                w-full h-full flex flex-col transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                bg-brand-surface rounded-2xl overflow-hidden
                ${isRoot ? 'border-4' : 'border-2'}
                ${isSelected
                    ? 'shadow-[0_0_0_4px_var(--tw-ring-color)] scale-[1.05] z-20 ring-offset-2 ring-offset-brand-bg'
                    : (isHighlighted || isSearchMatch 
                        ? 'shadow-[0_0_0_4px_var(--tw-ring-color)] z-10 scale-[1.02]' 
                        : 'shadow-anime hover:shadow-anime-hover hover:-translate-y-1')
                }
                ${node.isCollapsed && node.hasHiddenChildren ? 'shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]' : ''}
            `}
            style={{ 
                borderColor: isSelected || isHighlighted || isSearchMatch ? accentColor : 'var(--color-border)',
                '--tw-ring-color': `${accentColor}40`
            } as React.CSSProperties}
        >
           {/* Anime Style Header */}
           <div 
             className="px-3 py-2 flex items-center justify-between border-b-2 border-brand-border bg-brand-surface-highlight/30 shrink-0"
           >
               <div className="flex items-center gap-2 overflow-hidden">
                   <div className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: accentColor }}></div>
                   <span className="text-[10px] font-extrabold tracking-wide text-brand-text-secondary truncate uppercase">
                       {isRoot ? 'MAIN TOPIC' : `NODE ${node.id.substring(0, 4)}`}
                   </span>
               </div>
               
               {/* Collapse/Expand Button */}
               {(node.hasHiddenChildren || (node.children && node.children.length > 0)) && (
                   <button
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onToggle(node.id);
                        }}
                        className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-brand-surface border border-transparent hover:border-brand-border transition-all active:scale-90 cursor-pointer"
                   >
                       <Icon type={node.isCollapsed ? 'plus' : 'minus'} className="w-3 h-3 text-brand-text-secondary" />
                   </button>
               )}
           </div>

          {/* Content Body */}
          <div className="p-3 flex flex-col flex-1 bg-brand-surface">
            <h3 className={`font-bold text-sm leading-tight mb-1 ${isSearchMatch || isSelected ? 'text-brand-primary' : 'text-brand-text'}`}>
              {node.topic}
            </h3>
            {!node.isCollapsed && (
                <p className="text-xs text-brand-text-secondary leading-relaxed font-medium">
                {node.content}
                </p>
            )}
            {node.isCollapsed && node.hasHiddenChildren && (
                <div className="mt-auto pt-2 inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-md bg-brand-surface-highlight border border-brand-border">
                    <span className="text-[10px] font-bold text-brand-primary">{node.hiddenChildrenCount} hidden items</span>
                </div>
            )}
          </div>
          
          {/* Stacked effect for collapsed nodes */}
          {node.isCollapsed && node.hasHiddenChildren && (
              <div className="absolute inset-x-2 -bottom-1 h-2 bg-brand-surface border-2 border-brand-border rounded-b-xl -z-10"></div>
          )}
        </div>
      </foreignObject>
    </g>
  );
};

const OrthogonalConnector: React.FC<{ 
    from: { x: number, y: number, height: number }, 
    to: { x: number, y: number, height: number },
    color?: string 
}> = ({ from, to, color }) => {
  // Source: Right side of parent
  const startX = from.x + NODE_WIDTH;
  const startY = from.y + from.height / 2; // Center vertically relative to node height

  // Target: Left side of child
  const endX = to.x;
  const endY = to.y + to.height / 2; // Center vertically relative to node height

  // Orthogonal Routing (Left-to-Right Horizontal Elbow)
  // Path: Start -> Horizontal to Mid -> Vertical to Target Y -> Horizontal to End
  const midX = startX + (endX - startX) / 2;
  const radius = 12; // Corner radius

  let path = "";
  
  // Simple check to avoid weird radius artifacts on small distances
  if (Math.abs(midX - startX) < radius || Math.abs(endY - startY) < radius) {
      // Fallback to straight polyline if too tight
      path = `M ${startX},${startY} L ${midX},${startY} L ${midX},${endY} L ${endX},${endY}`;
  } else {
      // Rounded corners logic
      const dirY = endY > startY ? 1 : -1;
      
      path = `M ${startX},${startY} 
              L ${midX - radius},${startY} 
              Q ${midX},${startY} ${midX},${startY + radius * dirY}
              L ${midX},${endY - radius * dirY}
              Q ${midX},${endY} ${midX + radius},${endY}
              L ${endX},${endY}`;
  }

  return (
      <g>
         {/* Visible path - Anime style: Thicker, rounded caps */}
         <path 
            d={path} 
            fill="none" 
            stroke={color || "var(--color-border)"} 
            strokeWidth="2.5" 
            strokeLinecap="round"
            className="transition-all duration-500 ease-in-out"
            style={{ opacity: 0.4 }}
        />
      </g>
  );
};

// --- Layout Engine (Vertical List Style) ---

// Calculate the total HEIGHT needed for a subtree
const calculateTreeMetrics = (node: MindMapNodeData, collapsedIds: Set<string>): { height: number } => {
    const isCollapsed = collapsedIds.has(node.id);
    const nodeHeight = estimateNodeHeight(node, isCollapsed);
    
    if (isCollapsed || node.children.length === 0) {
        return { height: nodeHeight };
    }
    
    let childrenHeight = 0;
    node.children.forEach((child, index) => {
        childrenHeight += calculateTreeMetrics(child, collapsedIds).height;
        if (index < node.children.length - 1) {
            childrenHeight += VERTICAL_SPACING;
        }
    });
    
    // The tree height is the max of the node's own height and its children's total height
    // But usually, if children exist, they will be taller.
    // We need to ensure enough space for the node itself too.
    return { height: Math.max(nodeHeight, childrenHeight) };
};

const MindMap: React.FC<{ data: MindMapNodeData; searchQuery: string; hoveredNodeId: string | null; }> = ({ data, searchQuery, hoveredNodeId }) => {
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1000, height: 800 });
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Refs for dragging logic to avoid stale closures in global listeners
  const viewBoxRef = useRef(viewBox);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isPanning = useRef(false);
  const startPoint = useRef({ x: 0, y: 0 });
  const [hoveredInternal, setHoveredInternal] = useState<string | null>(null);
  const animationRef = useRef<number | null>(null);

  // Update ref when state changes
  useEffect(() => {
      viewBoxRef.current = viewBox;
  }, [viewBox]);

  const effectiveHoverId = hoveredNodeId || hoveredInternal;

  const toggleNodeCollapse = (id: string) => {
      setCollapsedNodeIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) {
              next.delete(id);
          } else {
              next.add(id);
          }
          return next;
      });
  };

  const flattenNodes = (node: ExtendedNodePosition): ExtendedNodePosition[] => {
      return [node, ...node.children.flatMap((child) => flattenNodes(child))];
  };

  // Advanced Tree Layout (Left-to-Right)
  const layoutTree = (
      node: MindMapNodeData, 
      x: number, 
      y: number, 
      depth = 0, 
      rootChildIndex = 0
  ): ExtendedNodePosition => {
    
    let color = undefined;
    if (depth >= 1) {
        color = getBranchColor(rootChildIndex);
    }
    if (depth === 0) color = undefined;

    const isCollapsed = collapsedNodeIds.has(node.id);
    const nodeHeight = estimateNodeHeight(node, isCollapsed);
    
    // Calculate metrics for children to center them
    let childrenTotalHeight = 0;
    if (!isCollapsed && node.children.length > 0) {
        node.children.forEach((child, index) => {
            childrenTotalHeight += calculateTreeMetrics(child, collapsedNodeIds).height;
            if (index < node.children.length - 1) {
                childrenTotalHeight += VERTICAL_SPACING;
            }
        });
    }

    // The total height occupied by this unit is max(nodeHeight, childrenTotalHeight)
    const totalUnitHeight = Math.max(nodeHeight, childrenTotalHeight);
    
    // Center the node vertically in this unit
    // y is the top of the unit
    const nodeY = y + (totalUnitHeight - nodeHeight) / 2;

    const positionedChildren: ExtendedNodePosition[] = [];
    
    // Position children
    if (!isCollapsed && node.children.length > 0) {
         // Start children at the top of the unit, plus any offset to center them if node is taller
         let currentChildY = y + (totalUnitHeight - childrenTotalHeight) / 2;

         node.children.forEach((child, index) => {
             const childMetrics = calculateTreeMetrics(child, collapsedNodeIds);
             const nextRootChildIndex = depth === 0 ? index : rootChildIndex;
             
             const childNode = layoutTree(child, x + NODE_WIDTH + HORIZONTAL_SPACING, currentChildY, depth + 1, nextRootChildIndex);
             positionedChildren.push(childNode);

             currentChildY += childMetrics.height + VERTICAL_SPACING;
         });
    }
    
    return { 
        ...node, 
        x, 
        y: nodeY, 
        height: nodeHeight,
        children: positionedChildren, 
        color, 
        depth,
        treeHeight: totalUnitHeight,
        isCollapsed,
        hasHiddenChildren: node.children.length > 0,
        hiddenChildrenCount: node.children.length
    };
  };

  const positionedData = useMemo(() => {
      return layoutTree(data, 0, 0);
  }, [data, collapsedNodeIds]); 
  
  const allNodes = useMemo(() => flattenNodes(positionedData), [positionedData]);
  const lowerCaseQuery = searchQuery.trim().toLowerCase();

  // --- Animation Helpers ---
  
  const tweenViewBox = (target: {x: number, y: number, width: number, height: number}) => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      
      const start = viewBoxRef.current;
      const startTime = performance.now();
      const duration = 600; // ms
      
      // Ease out cubic
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

      const animate = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const ease = easeOut(progress);
          
          const next = {
              x: start.x + (target.x - start.x) * ease,
              y: start.y + (target.y - start.y) * ease,
              width: start.width + (target.width - start.width) * ease,
              height: start.height + (target.height - start.height) * ease
          };
          
          setViewBox(next);
          
          if (progress < 1) {
              animationRef.current = requestAnimationFrame(animate);
          } else {
              animationRef.current = null;
          }
      };
      
      animationRef.current = requestAnimationFrame(animate);
  };

  const fitToScreen = () => {
      if (allNodes.length === 0 || !containerRef.current) return;
      
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      const xs = allNodes.map(n => n.x);
      const ys = allNodes.map(n => n.y);
      
      const paddingX = 100;
      const paddingY = 100;
      
      const minX = Math.min(...xs) - paddingX;
      const maxX = Math.max(...xs) + NODE_WIDTH + paddingX;
      const minY = Math.min(...ys) - paddingY;
      const maxY = Math.max(...ys) + NODE_HEIGHT_BASE + paddingY;
      
      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
      
      const scaleX = contentWidth / containerWidth;
      const scaleY = contentHeight / containerHeight;
      const scale = Math.max(scaleX, scaleY, 0.6); 

      const target = { 
          x: minX + (contentWidth - (containerWidth * scale)) / 2, 
          y: minY + (contentHeight - (containerHeight * scale)) / 2, 
          width: containerWidth * scale, 
          height: containerHeight * scale 
      };

      tweenViewBox(target);
  };

  const focusNode = (node: ExtendedNodePosition) => {
      setSelectedNodeId(node.id);
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      
      // Target zoom: visible area contains roughly 3 nodes width
      // Standard scale 1.0 means 1px SVG = 1px Screen
      // Let's aim for a close-up but not too close.
      // We want the node centered.
      
      const targetScale = 1.0; // 1:1 scale is usually good for reading text
      const targetWidth = containerWidth / targetScale;
      const targetHeight = containerHeight / targetScale;
      
      const nodeCenterX = node.x + NODE_WIDTH / 2;
      const nodeCenterY = node.y + NODE_HEIGHT_BASE / 2;
      
      const target = {
          x: nodeCenterX - targetWidth / 2,
          y: nodeCenterY - targetHeight / 2,
          width: targetWidth,
          height: targetHeight
      };
      
      tweenViewBox(target);
  };

  // Resize Observer for automatic responsiveness
  useEffect(() => {
      const resizeObserver = new ResizeObserver(() => {
          // Only fit to screen on initial load or significant layout change
          // We don't want to jump if user is interacting
      });
      if (containerRef.current) {
          resizeObserver.observe(containerRef.current);
      }
      // Initial fit
      setTimeout(fitToScreen, 100);
      return () => resizeObserver.disconnect();
  }, [data]);

  // --- Auto-Zoom to Search Results ---
  useEffect(() => {
      if (!searchQuery.trim()) {
          setSelectedNodeId(null);
          return;
      }

      const lowerQuery = searchQuery.trim().toLowerCase();
      const matches = allNodes.filter(n => 
          n.topic.toLowerCase().includes(lowerQuery) || 
          n.content.toLowerCase().includes(lowerQuery)
      );

      if (matches.length > 0) {
          // Focus first match or bounds of all matches
          const minX = Math.min(...matches.map(n => n.x));
          const maxX = Math.max(...matches.map(n => n.x)) + NODE_WIDTH;
          const minY = Math.min(...matches.map(n => n.y));
          const maxY = Math.max(...matches.map(n => n.y)) + NODE_HEIGHT_BASE;

          const padding = 150;
          const boxWidth = maxX - minX;
          const boxHeight = maxY - minY;

          const minViewWidth = NODE_WIDTH * 2; 
          const minViewHeight = NODE_HEIGHT_BASE * 4;

          const targetWidth = Math.max(boxWidth + (padding * 2), minViewWidth);
          const targetHeight = Math.max(boxHeight + (padding * 2), minViewHeight);
          
          const centerX = minX + boxWidth / 2;
          const centerY = minY + boxHeight / 2;

          tweenViewBox({
              x: centerX - targetWidth / 2,
              y: centerY - targetHeight / 2,
              width: targetWidth,
              height: targetHeight
          });
      }
  }, [searchQuery, allNodes]);

  // --- Global Dragging Handlers ---
  useEffect(() => {
      const handleGlobalMouseMove = (e: MouseEvent) => {
          if (!isPanning.current || !containerRef.current) return;
          e.preventDefault();

          const currentViewBox = viewBoxRef.current;
          const { width, height } = containerRef.current.getBoundingClientRect();
          
          // Calculate scale based on current zoom level
          const scaleX = currentViewBox.width / width;
          const scaleY = currentViewBox.height / height;

          const dx = (e.clientX - startPoint.current.x) * scaleX;
          const dy = (e.clientY - startPoint.current.y) * scaleY;

          startPoint.current = { x: e.clientX, y: e.clientY };

          setViewBox(prev => ({
              ...prev,
              x: prev.x - dx,
              y: prev.y - dy
          }));
      };

      const handleGlobalMouseUp = () => {
          if (isPanning.current) {
              isPanning.current = false;
              document.body.style.cursor = '';
          }
      };

      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
          window.removeEventListener('mousemove', handleGlobalMouseMove);
          window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
  }, []); 

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Allow panning with Left Click (0) or Middle Click (1)
    if (e.button !== 0 && e.button !== 1) return; 
    
    e.preventDefault();
    e.stopPropagation();

    // Stop any active animation
    if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
    }

    isPanning.current = true;
    startPoint.current = { x: e.clientX, y: e.clientY };
    document.body.style.cursor = 'grabbing';
    
    // Deselect if clicking on empty space
    // (Node click stops propagation, so this runs only on background)
    setSelectedNodeId(null);
  };
  
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
    }

    const isZoom = e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaX === 0; 
    
    if (isZoom && !e.shiftKey) {
        const { width, height, left, top } = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - left;
        const mouseY = e.clientY - top;
        
        const zoomIn = e.deltaY < 0;
        const scaleFactor = 1.05;
        const factor = zoomIn ? 1 / scaleFactor : scaleFactor;

        const newWidth = viewBox.width * factor;
        const newHeight = viewBox.height * factor;
        
        const dx = (mouseX / width) * (viewBox.width - newWidth);
        const dy = (mouseY / height) * (viewBox.height - newHeight);

        setViewBox(prev => ({
            x: prev.x + dx,
            y: prev.y + dy,
            width: newWidth,
            height: newHeight
        }));
    } else {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const scaleX = viewBox.width / width;
        const scaleY = viewBox.height / height;

        setViewBox(prev => ({
            ...prev,
            x: prev.x + e.deltaX * scaleX,
            y: prev.y + e.deltaY * scaleY
        }));
    }
  };

  const zoomByFactor = (factor: number) => {
    const targetWidth = viewBox.width * factor;
    const targetHeight = viewBox.height * factor;
    const dx = (viewBox.width - targetWidth) / 2;
    const dy = (viewBox.height - targetHeight) / 2;
    
    tweenViewBox({
        x: viewBox.x + dx,
        y: viewBox.y + dy,
        width: targetWidth,
        height: targetHeight
    });
  };

  return (
    <div 
        ref={containerRef} 
        className="w-full h-full relative group overflow-hidden bg-brand-bg md:rounded-xl md:border border-brand-border shadow-inner select-none cursor-grab active:cursor-grabbing touch-none"
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className="touch-none pointer-events-none" // Events handled by parent DIV
      >
        <defs>
            {/* Technical Grid Pattern */}
          <pattern id="grid-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--color-border)" strokeWidth="0.5" opacity="0.3"/>
          </pattern>
          <pattern id="dot-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
             <circle cx="1" cy="1" r="1" fill="var(--color-text-secondary)" opacity="0.2" />
          </pattern>
        </defs>
        
        <rect x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} fill="url(#dot-pattern)" />

        {/* Connectors Layer */}
        <g>
            {allNodes.map(node => (
            node.children.map(child => (
                <OrthogonalConnector 
                    key={`conn-${node.id}-${child.id}`} 
                    from={{x: node.x, y: node.y, height: node.height}} 
                    to={{x: child.x, y: child.y, height: child.height}} 
                    color={child.color} 
                />
            ))
            ))}
        </g>
        
        {/* Nodes Layer */}
        <g className="pointer-events-auto"> 
            {/* Re-enable pointer events for nodes so they can be clicked/hovered */}
            {allNodes.map(node => {
            const isSearchMatch = lowerCaseQuery ? 
                node.topic.toLowerCase().includes(lowerCaseQuery) || 
                node.content.toLowerCase().includes(lowerCaseQuery) : 
                false;
            const isHighlighted = node.id === effectiveHoverId;
            const isSelected = node.id === selectedNodeId;
            
            return (
                <MindMapNode 
                    key={node.id} 
                    node={node} 
                    isHighlighted={isHighlighted} 
                    isSelected={isSelected}
                    isSearchMatch={isSearchMatch} 
                    onHover={setHoveredInternal}
                    onToggle={toggleNodeCollapse}
                    onClick={focusNode}
                />
            );
            })}
        </g>
      </svg>

      {/* Floating Controls */}
      <div 
        className="absolute bottom-6 right-6 flex flex-col gap-2 bg-brand-surface/95 backdrop-blur-md rounded-2xl shadow-anime border-2 border-brand-border p-2 z-20"
        onMouseDown={(e) => e.stopPropagation()} // Prevent dragging canvas when clicking controls
      >
        <button 
            onClick={() => zoomByFactor(0.6)} 
            className="p-2 rounded-xl hover:bg-brand-surface-highlight text-brand-text hover:text-brand-primary transition-all active:scale-95"
            title="Zoom In"
        >
            <Icon type="plus" className="w-5 h-5" />
        </button>
        <button 
            onClick={() => zoomByFactor(1.4)} 
            className="p-2 rounded-xl hover:bg-brand-surface-highlight text-brand-text hover:text-brand-primary transition-all active:scale-95"
            title="Zoom Out"
        >
            <Icon type="minus" className="w-5 h-5" />
        </button>
        <div className="h-0.5 bg-brand-border/50 mx-2 my-0.5 rounded-full"></div>
        <button 
            onClick={fitToScreen} 
            className="p-2 rounded-xl hover:bg-brand-surface-highlight text-brand-text hover:text-brand-primary transition-all active:scale-95"
            title="Fit to Screen"
        >
            <Icon type="maximize" className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default MindMap;
