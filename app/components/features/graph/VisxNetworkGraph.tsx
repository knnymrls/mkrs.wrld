'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Group } from '@visx/group';
import { Zoom } from '@visx/zoom';
import { localPoint } from '@visx/event';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  SimulationNodeDatum,
  SimulationLinkDatum,
  Simulation
} from 'd3-force';
import { ProfileNode, ProjectNode, PostNode, GraphLink } from '@/app/types/graph';
import { getDivisionColor } from '@/lib/constants/divisions';
import { calculateDivisionGroups, applyDivisionForces } from '@/lib/graph/divisionGrouping';

// Extended node type with d3-force simulation properties
export interface SimulationNode extends SimulationNodeDatum {
  id: string;
  type: 'profile' | 'project' | 'post';
  name?: string;
  title?: string;
  description?: string;
  content?: string;
  authorName?: string;
  avatar_url?: string | null;
  division?: string | null;
  department?: string | null;
  team?: string | null;
  location?: string | null;
  status?: string;
  created_at?: string;
  skills?: string[];
  connectionCount?: number;
}

// Extended link type with d3-force simulation properties
export interface SimulationLink extends SimulationLinkDatum<SimulationNode> {
  source: string | SimulationNode;
  target: string | SimulationNode;
  type: 'authored' | 'mentions_profile' | 'mentions_project' | 'contributes';
}

interface VisxNetworkGraphProps {
  nodes: (ProfileNode | ProjectNode | PostNode)[];
  links: GraphLink[];
  width: number;
  height: number;
  onNodeClick?: (node: SimulationNode) => void;
  onNodeHover?: (node: SimulationNode | null) => void;
  selectedDivisions?: string[];
  showDivisionGroups?: boolean;
  searchQuery?: string;
  minConnections?: number;
  zoomControls?: {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomReset: () => void;
  };
}

const VisxNetworkGraph: React.FC<VisxNetworkGraphProps> = ({
  nodes: rawNodes,
  links: rawLinks,
  width,
  height,
  onNodeClick,
  onNodeHover,
  selectedDivisions = [],
  showDivisionGroups = false,
  searchQuery = '',
  minConnections = 0,
  zoomControls
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [simulation, setSimulation] = useState<Simulation<SimulationNode, SimulationLink> | null>(null);
  const [animatedNodes, setAnimatedNodes] = useState<SimulationNode[]>([]);
  const [animatedLinks, setAnimatedLinks] = useState<SimulationLink[]>([]);
  const [imageCache] = useState<Map<string, HTMLImageElement>>(new Map());
  const zoomRef = useRef<any>(null);

  // Convert raw nodes to simulation nodes with positions
  const nodes = useMemo(() => {
    return rawNodes.map(node => ({
      ...node,
      x: node.x || Math.random() * width,
      y: node.y || Math.random() * height,
      connectionCount: 0 // Will be calculated later
    })) as SimulationNode[];
  }, [rawNodes, width, height]);

  // Convert raw links to simulation links
  const links = useMemo(() => {
    return rawLinks.map(link => ({
      ...link,
      source: link.source,
      target: link.target
    })) as SimulationLink[];
  }, [rawLinks]);

  // Calculate connection counts
  useEffect(() => {
    const counts = new Map<string, number>();
    links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      counts.set(sourceId, (counts.get(sourceId) || 0) + 1);
      counts.set(targetId, (counts.get(targetId) || 0) + 1);
    });
    
    nodes.forEach(node => {
      node.connectionCount = counts.get(node.id) || 0;
    });
  }, [nodes, links]);

  // Initialize force simulation
  useEffect(() => {
    const sim = forceSimulation<SimulationNode>(nodes)
      .force('link', forceLink<SimulationNode, SimulationLink>(links)
        .id(d => d.id)
        .distance(50))
      .force('charge', forceManyBody().strength(-300))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide(30))
      .on('tick', () => {
        setAnimatedNodes([...nodes]);
        setAnimatedLinks([...links]);
      });

    // Add division forces if enabled
    if (showDivisionGroups && selectedDivisions.length > 0) {
      sim.force('division', applyDivisionForces(sim, nodes, selectedDivisions));
    }

    setSimulation(sim);

    return () => {
      sim.stop();
    };
  }, [nodes, links, width, height, showDivisionGroups, selectedDivisions]);

  // Filter nodes based on search query
  const matchesSearch = useCallback((node: SimulationNode) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    if (node.type === 'profile') {
      return node.name?.toLowerCase().includes(query) ||
             node.title?.toLowerCase().includes(query) ||
             node.skills?.some(skill => skill.toLowerCase().includes(query));
    } else if (node.type === 'project') {
      return node.title?.toLowerCase().includes(query) ||
             node.description?.toLowerCase().includes(query);
    } else if (node.type === 'post') {
      return node.content?.toLowerCase().includes(query);
    }
    return false;
  }, [searchQuery]);

  // Get node radius based on connections
  const getNodeRadius = (node: SimulationNode) => {
    const baseRadius = node.type === 'profile' ? 20 : 15;
    const connectionBonus = Math.min(node.connectionCount || 0, 10) * 0.5;
    return baseRadius + connectionBonus;
  };

  // Get node color
  const getNodeColor = (node: SimulationNode) => {
    switch (node.type) {
      case 'profile':
        return '#ffffff';
      case 'project':
        return '#F59E0B';
      case 'post':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  // Handle node hover
  const handleNodeHover = (node: SimulationNode | null) => {
    setHoveredNode(node?.id || null);
    onNodeHover?.(node);
  };

  // Get connected node IDs
  const getConnectedNodes = useMemo(() => {
    const connections = new Map<string, Set<string>>();
    
    animatedLinks.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (!connections.has(sourceId)) connections.set(sourceId, new Set());
      if (!connections.has(targetId)) connections.set(targetId, new Set());
      
      connections.get(sourceId)!.add(targetId);
      connections.get(targetId)!.add(sourceId);
    });
    
    return connections;
  }, [animatedLinks]);

  // Check if node should be dimmed
  const shouldDimNode = (node: SimulationNode) => {
    if (!hoveredNode) return false;
    if (node.id === hoveredNode) return false;
    
    const connectedNodes = getConnectedNodes.get(hoveredNode);
    return !connectedNodes?.has(node.id);
  };

  // Setup zoom controls
  useEffect(() => {
    if (zoomRef.current && zoomControls) {
      zoomControls.onZoomIn = () => {
        const currentScale = zoomRef.current.transformMatrix.scaleX;
        zoomRef.current.scale({ scaleX: currentScale * 1.2, scaleY: currentScale * 1.2 });
      };
      zoomControls.onZoomOut = () => {
        const currentScale = zoomRef.current.transformMatrix.scaleX;
        zoomRef.current.scale({ scaleX: currentScale / 1.2, scaleY: currentScale / 1.2 });
      };
      zoomControls.onZoomReset = () => {
        zoomRef.current.reset();
      };
    }
  }, [zoomControls]);

  return (
    <Zoom<SVGSVGElement>
      width={width}
      height={height}
      scaleMin={0.1}
      scaleMax={4}
      center={{ x: width / 2, y: height / 2 }}
    >
      {(zoom) => {
        zoomRef.current = zoom;
        return (
        <svg
          ref={svgRef}
          width={width}
          height={height}
          style={{ cursor: zoom.isDragging ? 'grabbing' : 'grab' }}
        >
          <rect
            width={width}
            height={height}
            fill="#0A0A0B"
            onTouchStart={zoom.dragStart}
            onTouchMove={zoom.dragMove}
            onTouchEnd={zoom.dragEnd}
            onMouseDown={zoom.dragStart}
            onMouseMove={zoom.dragMove}
            onMouseUp={zoom.dragEnd}
            onMouseLeave={() => {
              if (zoom.isDragging) zoom.dragEnd();
            }}
          />
          
          <Group transform={zoom.toString()}>
            {/* Render division groups if enabled */}
            {showDivisionGroups && selectedDivisions.length > 0 && (
              <Group>
                {calculateDivisionGroups(animatedNodes, selectedDivisions).map(group => (
                  <circle
                    key={group.division}
                    cx={group.center.x}
                    cy={group.center.y}
                    r={group.radius}
                    fill={getDivisionColor(group.division)}
                    opacity={0.1}
                    stroke={getDivisionColor(group.division)}
                    strokeWidth={2}
                    strokeOpacity={0.3}
                    style={{ pointerEvents: 'none' }}
                  />
                ))}
              </Group>
            )}
            
            {/* Render links */}
            <Group>
              {animatedLinks.map((link, i) => {
                const sourceNode = typeof link.source === 'object' ? link.source : null;
                const targetNode = typeof link.target === 'object' ? link.target : null;
                
                if (!sourceNode || !targetNode) return null;
                
                const isDimmed = hoveredNode && 
                  sourceNode.id !== hoveredNode && 
                  targetNode.id !== hoveredNode;
                
                return (
                  <line
                    key={i}
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke="#4B5563"
                    strokeWidth={0.75}
                    opacity={isDimmed ? 0.1 : 0.6}
                    style={{ transition: 'opacity 0.3s' }}
                  />
                );
              })}
            </Group>
            
            {/* Render nodes */}
            <Group>
              {animatedNodes.map((node) => {
                if (!matchesSearch(node)) return null;
                if (node.connectionCount! < minConnections) return null;
                if (node.type === 'profile' && selectedDivisions.length > 0 && 
                    !selectedDivisions.includes(node.division || '')) return null;
                
                const radius = getNodeRadius(node);
                const isDimmed = shouldDimNode(node);
                
                return (
                  <Group key={node.id}>
                    {/* Division color ring for profile nodes */}
                    {node.type === 'profile' && node.division && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={radius + 3}
                        fill={getDivisionColor(node.division)}
                        opacity={isDimmed ? 0.1 : 0.8}
                        style={{ transition: 'opacity 0.3s' }}
                      />
                    )}
                    
                    {/* Main node circle */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={radius}
                      fill={getNodeColor(node)}
                      stroke={node.id === hoveredNode ? '#3B82F6' : 'none'}
                      strokeWidth={2}
                      opacity={isDimmed ? 0.3 : 1}
                      style={{ 
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={() => handleNodeHover(node)}
                      onMouseLeave={() => handleNodeHover(null)}
                      onClick={() => onNodeClick?.(node)}
                    />
                    
                    {/* Node content (emoji/avatar for profiles) */}
                    {node.type === 'profile' && (
                      <>
                        {node.avatar_url ? (
                          <>
                            <defs>
                              <clipPath id={`clip-${node.id}`}>
                                <circle cx={node.x} cy={node.y} r={radius - 1} />
                              </clipPath>
                            </defs>
                            <image
                              href={node.avatar_url}
                              x={node.x! - radius}
                              y={node.y! - radius}
                              width={radius * 2}
                              height={radius * 2}
                              clipPath={`url(#clip-${node.id})`}
                              style={{ pointerEvents: 'none' }}
                              onLoad={(e) => {
                                const img = e.target as any;
                                imageCache.set(node.avatar_url!, img);
                              }}
                            />
                          </>
                        ) : (
                          <text
                            x={node.x}
                            y={node.y}
                            dy={radius / 3}
                            fontSize={radius}
                            textAnchor="middle"
                            fill="#000000"
                            style={{ pointerEvents: 'none' }}
                          >
                            👤
                          </text>
                        )}
                      </>
                    )}
                    
                    {/* Labels (shown when zoomed in) */}
                    {zoom.transformMatrix.scaleX > 0.7 && (
                      <text
                        x={node.x}
                        y={node.y! + radius + 15}
                        fontSize={12}
                        textAnchor="middle"
                        fill="#E5E7EB"
                        style={{ pointerEvents: 'none' }}
                      >
                        {node.name || node.title || 'Post'}
                      </text>
                    )}
                  </Group>
                );
              })}
            </Group>
          </Group>
        </svg>
        );
      }}
    </Zoom>
  );
};

export default VisxNetworkGraph;