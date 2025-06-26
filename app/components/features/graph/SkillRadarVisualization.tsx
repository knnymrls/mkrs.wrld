'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface SkillNode {
  id: string;
  label: string;
  type: 'skill' | 'person' | 'gap';
  expertCount?: number;
  demandLevel?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  peopleIds?: string[];
}

interface SkillRadarProps {
  graphData: any;
  dimensions: { width: number; height: number };
  onNodeClick: (node: any) => void;
  onNodeHover: (node: any) => void;
}

export default function SkillRadarVisualization({ 
  graphData, 
  dimensions, 
  onNodeClick,
  onNodeHover 
}: SkillRadarProps) {
  const [selectedSkillCluster, setSelectedSkillCluster] = useState<string | null>(null);
  const graphRef = React.useRef<any>(null);

  // Process data to create skill clusters
  const skillRadarData = useMemo(() => {
    // Extract skills from profiles
    const skillMap = new Map<string, Set<string>>();
    const skillDemand = new Map<string, number>();
    
    // Analyze profiles for skills
    graphData.nodes.forEach((node: any) => {
      if (node.type === 'profile' && node.skills) {
        node.skills.forEach((skill: string) => {
          if (!skillMap.has(skill)) {
            skillMap.set(skill, new Set());
          }
          skillMap.get(skill)!.add(node.id);
        });
      }
    });

    // Analyze posts for skill demand
    graphData.nodes.forEach((node: any) => {
      if (node.type === 'post') {
        const content = node.label.toLowerCase();
        // Simple keyword matching - in production, use NLP
        const techKeywords = ['react', 'python', 'kubernetes', 'ml', 'graphql', 'typescript', 'aws', 'docker'];
        techKeywords.forEach(keyword => {
          if (content.includes(keyword)) {
            skillDemand.set(keyword, (skillDemand.get(keyword) || 0) + 1);
          }
        });
      }
    });

    // Create skill nodes
    const skillNodes: SkillNode[] = [];
    const skillLinks: any[] = [];
    
    // Add skill cluster nodes
    skillMap.forEach((peopleIds, skill) => {
      const expertCount = peopleIds.size;
      const demand = skillDemand.get(skill.toLowerCase()) || 0;
      const riskLevel = expertCount === 0 ? 'high' : expertCount === 1 ? 'medium' : 'low';
      
      const skillNode: SkillNode = {
        id: `skill-${skill}`,
        label: skill,
        type: 'skill',
        expertCount,
        demandLevel: demand,
        riskLevel,
        peopleIds: Array.from(peopleIds)
      };
      
      skillNodes.push(skillNode);
      
      // Create links from people to skills
      peopleIds.forEach(personId => {
        skillLinks.push({
          source: personId,
          target: skillNode.id,
          type: 'has-skill'
        });
      });
    });

    // Add gap nodes for high-demand, low-supply skills
    const gapSkills = ['GraphQL', 'Rust', 'Kubernetes', 'ML Ops'];
    gapSkills.forEach(skill => {
      if (!skillMap.has(skill)) {
        skillNodes.push({
          id: `gap-${skill}`,
          label: `${skill} (Gap)`,
          type: 'gap',
          expertCount: 0,
          demandLevel: 3,
          riskLevel: 'high'
        });
      }
    });

    // Combine with original data
    return {
      nodes: [...graphData.nodes.filter((n: any) => n.type === 'profile'), ...skillNodes],
      links: [...skillLinks]
    };
  }, [graphData]);

  // Calculate positions for radar layout
  const getRadarPosition = (index: number, total: number, radius: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return {
      x: dimensions.width / 2 + radius * Math.cos(angle),
      y: dimensions.height / 2 + radius * Math.sin(angle)
    };
  };

  return (
    <div className="relative w-full h-full">
      {/* Skill Radar Legend */}
      <div className="absolute top-4 left-4 z-20 bg-surface-container rounded-xl p-4 shadow-sm max-w-xs">
        <h3 className="font-medium text-onsurface-primary mb-3">
          Skill Coverage
        </h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-onsurface-secondary">Well-covered (3+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-onsurface-secondary">At-risk (1-2)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-onsurface-secondary">Gap (0)</span>
          </div>
        </div>
      </div>


      {/* Graph Canvas */}
      <div className="w-full h-full">
        <ForceGraph2D
          ref={graphRef}
          graphData={skillRadarData}
          width={dimensions.width}
          height={dimensions.height - 73}
          backgroundColor="transparent"
          nodeLabel={() => ''}
          onNodeClick={(node: any) => {
            if (node.type === 'skill' || node.type === 'gap') {
              setSelectedSkillCluster(node.id);
            }
            onNodeClick(node);
          }}
          onNodeHover={onNodeHover}
          cooldownTicks={100}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const label = node.label as string;
            let color = '#3B82F6';
            let size = 8;
            
            if (node.type === 'skill') {
              // Color based on risk level
              color = node.riskLevel === 'high' ? '#EF4444' : 
                     node.riskLevel === 'medium' ? '#F59E0B' : '#10B981';
              // Size based on expert count
              size = 10 + (node.expertCount || 0) * 3;
              
              // Draw node
              ctx.beginPath();
              ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
              
              // Add pulse animation for high demand
              if (node.demandLevel > 2) {
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.arc(node.x!, node.y!, size + 10, 0, 2 * Math.PI);
                ctx.fillStyle = '#8B5CF6';
                ctx.fill();
                ctx.globalAlpha = 1;
              }
              
              // Draw label
              ctx.font = `${Math.max(12 / globalScale, 10)}px Inter, sans-serif`;
              ctx.fillStyle = '#1F2937';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'top';
              ctx.fillText(label, node.x!, node.y! + size + 2);
              
              // Show expert count
              if (node.expertCount !== undefined) {
                ctx.font = `${Math.max(10 / globalScale, 8)}px Inter, sans-serif`;
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(node.expertCount.toString(), node.x!, node.y!);
              }
            } else if (node.type === 'gap') {
              // Draw gap nodes with dashed border
              ctx.strokeStyle = '#EF4444';
              ctx.lineWidth = 2;
              ctx.setLineDash([5, 5]);
              ctx.beginPath();
              ctx.arc(node.x!, node.y!, 15, 0, 2 * Math.PI);
              ctx.stroke();
              ctx.setLineDash([]);
              
              // Label
              ctx.font = `${Math.max(12 / globalScale, 10)}px Inter, sans-serif`;
              ctx.fillStyle = '#EF4444';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'top';
              ctx.fillText(label, node.x!, node.y! + 20);
            } else if (node.type === 'profile') {
              // Draw people nodes smaller
              ctx.beginPath();
              ctx.arc(node.x!, node.y!, 4, 0, 2 * Math.PI);
              ctx.fillStyle = '#6B7280';
              ctx.fill();
            }
          }}
          linkCanvasObject={(link, ctx) => {
            ctx.strokeStyle = '#E5E7EB';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.3;
            
            const source = link.source as any;
            const target = link.target as any;
            
            ctx.beginPath();
            ctx.moveTo(source.x, source.y);
            ctx.lineTo(target.x, target.y);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }}
        />
      </div>
    </div>
  );
}