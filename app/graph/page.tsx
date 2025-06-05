'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface ProfileNode {
    id: string;
    label: string;
    type: 'profile';
}

interface PostNode {
    id: string;
    label: string;
    type: 'post';
}

interface Link {
    source: string;
    target: string;
}

export default function GraphPage() {
    const [graphData, setGraphData] = useState<{ nodes: (ProfileNode | PostNode)[]; links: Link[] }>({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [animatedNodeOpacities, setAnimatedNodeOpacities] = useState<{ [id: string]: number }>({});
    const [animatedLinkOpacities, setAnimatedLinkOpacities] = useState<{ [key: string]: number }>({});
    const animationRef = useRef<number | null>(null);

    // Compute related nodes and links for highlighting
    const related = useMemo(() => {
        if (!selectedNode || !graphData) return { nodeIds: new Set(), linkPairs: new Set() };
        const nodeIds = new Set([selectedNode]);
        const linkPairs = new Set<string>();
        graphData.links.forEach(link => {
            const getId = (n: any) => (typeof n === 'object' && n !== null && 'id' in n ? (n as { id: string }).id : n);
            const sourceId = getId(link.source);
            const targetId = getId(link.target);
            if (sourceId === selectedNode) {
                nodeIds.add(targetId);
                linkPairs.add(`${sourceId}|${targetId}`);
            }
            if (targetId === selectedNode) {
                nodeIds.add(sourceId);
                linkPairs.add(`${sourceId}|${targetId}`);
            }
        });
        return { nodeIds, linkPairs };
    }, [selectedNode, graphData]);

    // Animate opacities when highlight state changes
    useEffect(() => {
        if (!graphData) return;
        const duration = 200;
        const start = performance.now();
        const nodeTarget: { [id: string]: number } = {};
        const linkTarget: { [key: string]: number } = {};
        graphData.nodes.forEach(node => {
            nodeTarget[node.id] = !selectedNode || related.nodeIds.has(node.id) ? 1 : 0.2;
        });
        graphData.links.forEach(link => {
            const getId = (n: any) => (typeof n === 'object' && n !== null && 'id' in n ? (n as { id: string }).id : n);
            const sourceId = getId(link.source);
            const targetId = getId(link.target);
            const key = `${sourceId}|${targetId}`;
            linkTarget[key] = !selectedNode || (related.nodeIds.has(sourceId) && related.nodeIds.has(targetId)) ? 1 : 0.1;
        });
        const initialNode = { ...animatedNodeOpacities };
        const initialLink = { ...animatedLinkOpacities };
        const animate = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const newNode: { [id: string]: number } = {};
            const newLink: { [key: string]: number } = {};
            Object.keys(nodeTarget).forEach(id => {
                const from = initialNode[id] !== undefined ? initialNode[id] : nodeTarget[id];
                newNode[id] = from + (nodeTarget[id] - from) * t;
            });
            Object.keys(linkTarget).forEach(key => {
                const from = initialLink[key] !== undefined ? initialLink[key] : linkTarget[key];
                newLink[key] = from + (linkTarget[key] - from) * t;
            });
            setAnimatedNodeOpacities(newNode);
            setAnimatedLinkOpacities(newLink);
            if (t < 1) {
                animationRef.current = requestAnimationFrame(animate);
            }
        };
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        animationRef.current = requestAnimationFrame(animate);
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [selectedNode, graphData, related]);

    useEffect(() => {
        const fetchData = async () => {
            const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id, full_name');
            const { data: posts, error: postsError } = await supabase.from('posts').select('id, profile_id, content');

            if (profilesError || postsError) {
                setLoading(false);
                return;
            }

            const profileNodes: ProfileNode[] = (profiles || []).map((p: any) => ({
                id: p.id,
                label: p.full_name || 'Unnamed',
                type: 'profile',
            }));
            const postNodes: PostNode[] = (posts || []).map((p: any) => ({
                id: p.id,
                label: p.content?.slice(0, 30) || 'Post',
                type: 'post',
            }));
            const links: Link[] = (posts || []).map((p: any) => ({
                source: p.profile_id,
                target: p.id,
            }));
            const reverseLinks: Link[] = (posts || []).map((p: any) => ({
                source: p.id,
                target: p.profile_id,
            }));

            setGraphData({
                nodes: [...profileNodes, ...postNodes],
                links: [...links, ...reverseLinks],
            });
            setLoading(false);
        };
        fetchData();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Graph View: Profiles & Posts</h1>
                {loading ? (
                    <p className="text-gray-500 dark:text-gray-400">Loading graph...</p>
                ) : (
                    <div
                        className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center justify-center"
                        style={{ height: 600, maxWidth: '100%', maxHeight: 600, overflow: 'hidden' }}
                    >
                        <ForceGraph2D
                            graphData={graphData}
                            width={900}
                            height={550}
                            nodeLabel={(node: any) => node.label}
                            nodeAutoColorBy="type"
                            onNodeClick={(node: any) => setSelectedNode(node.id)}
                            onBackgroundClick={() => setSelectedNode(null)}
                            nodeCanvasObjectMode={() => 'replace'}
                            nodeCanvasObject={(node, ctx, globalScale) => {
                                const opacity = node.id && animatedNodeOpacities[node.id] !== undefined ? animatedNodeOpacities[node.id] : 1;
                                const color = node.type === 'profile' ? '#6366f1' : '#10b981';
                                // Draw node circle
                                ctx.globalAlpha = opacity;
                                ctx.beginPath();
                                ctx.arc(node.x as number, node.y as number, 8, 0, 2 * Math.PI, false);
                                ctx.fillStyle = color;
                                ctx.fill();
                                // Draw label
                                const label = node.label;
                                const fontSize = 12 / globalScale;
                                ctx.font = `${fontSize}px Sans-Serif`;
                                ctx.fillStyle = color;
                                ctx.fillText(label, (node.x as number) + 12, (node.y as number) + 4);
                                ctx.globalAlpha = 1;
                            }}
                            linkCanvasObjectMode={() => 'after'}
                            linkCanvasObject={(link, ctx) => {
                                ctx.save();
                                const getId = (n: any) => (typeof n === 'object' && n !== null && 'id' in n ? (n as { id: string }).id : n);
                                const sourceId = getId(link.source);
                                const targetId = getId(link.target);
                                let opacity = 1;
                                if (sourceId && targetId) {
                                    const key = `${sourceId}|${targetId}`;
                                    opacity = animatedLinkOpacities[key] !== undefined ? animatedLinkOpacities[key] : 1;
                                }
                                ctx.globalAlpha = opacity;
                                ctx.strokeStyle = '#888';
                                ctx.lineWidth = 1.5;
                                // Type guard for source and target
                                const source = typeof link.source === 'object' && link.source !== null && 'x' in link.source && 'y' in link.source ? link.source : null;
                                const target = typeof link.target === 'object' && link.target !== null && 'x' in link.target && 'y' in link.target ? link.target : null;
                                if (
                                    source && target &&
                                    typeof source.x === 'number' && typeof source.y === 'number' &&
                                    typeof target.x === 'number' && typeof target.y === 'number'
                                ) {
                                    ctx.beginPath();
                                    ctx.moveTo(source.x, source.y);
                                    ctx.lineTo(target.x, target.y);
                                    ctx.stroke();
                                }
                                ctx.restore();
                            }}
                            nodePointerAreaPaint={(node, color, ctx) => {
                                ctx.beginPath();
                                ctx.arc(node.x as number, node.y as number, 8, 0, 2 * Math.PI, false);
                                ctx.fillStyle = color;
                                ctx.fill();
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
} 