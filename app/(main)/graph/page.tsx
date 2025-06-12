'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface ProfileNode {
    id: string;
    label: string;
    type: 'profile';
    title?: string;
    location?: string;
}

interface PostNode {
    id: string;
    label: string;
    type: 'post';
    authorName?: string;
}

interface ProjectNode {
    id: string;
    label: string;
    type: 'project';
    status?: string;
    description?: string;
}

type GraphNode = ProfileNode | PostNode | ProjectNode;

interface Link {
    source: string;
    target: string;
    type: 'authored' | 'mentions_profile' | 'mentions_project' | 'contributes';
}

export default function GraphPage() {
    const router = useRouter();
    const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: Link[] }>({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<GraphNode[]>([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);
    const [animatedNodeOpacities, setAnimatedNodeOpacities] = useState<{ [id: string]: number }>({});
    const [animatedLinkOpacities, setAnimatedLinkOpacities] = useState<{ [key: string]: number }>({});
    const [nodeConnectionCounts, setNodeConnectionCounts] = useState<{ [id: string]: number }>({});
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const animationRef = useRef<number | null>(null);
    const graphRef = useRef<any>();
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Update dimensions on window resize
    useEffect(() => {
        const updateDimensions = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight - 100 // Leave some space for header
            });
        };
        
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

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
            // Fetch all data in parallel
            const [
                { data: profiles, error: profilesError },
                { data: posts, error: postsError },
                { data: projects, error: projectsError },
                { data: postMentions, error: postMentionsError },
                { data: postProjects, error: postProjectsError },
                { data: contributions, error: contributionsError }
            ] = await Promise.all([
                supabase.from('profiles').select('id, name, title, location'),
                supabase.from('posts').select('id, author_id, content'),
                supabase.from('projects').select('id, title, description, status'),
                supabase.from('post_mentions').select('post_id, profile_id'),
                supabase.from('post_projects').select('post_id, project_id'),
                supabase.from('contributions').select('person_id, project_id, role')
            ]);

            if (profilesError || postsError || projectsError) {
                console.error('Error fetching data:', { profilesError, postsError, projectsError });
                setLoading(false);
                return;
            }

            // Create profile ID to name map for post labels
            const profileMap = new Map((profiles || []).map(p => [p.id, p.name]));

            // Create nodes
            const profileNodes: ProfileNode[] = (profiles || []).map((p: any) => ({
                id: p.id,
                label: p.name || 'Unnamed',
                type: 'profile',
                title: p.title,
                location: p.location
            }));

            const postNodes: PostNode[] = (posts || []).map((p: any) => ({
                id: `post-${p.id}`,
                label: p.content || 'Post',
                type: 'post',
                authorName: profileMap.get(p.author_id) || 'Unknown'
            }));

            const projectNodes: ProjectNode[] = (projects || []).map((p: any) => ({
                id: `project-${p.id}`,
                label: p.title || 'Untitled Project',
                type: 'project',
                status: p.status,
                description: p.description
            }));

            // Create links
            const authorLinks: Link[] = (posts || []).map((p: any) => ({
                source: p.author_id,
                target: `post-${p.id}`,
                type: 'authored' as const
            }));

            const mentionLinks: Link[] = (postMentions || []).map((m: any) => ({
                source: `post-${m.post_id}`,
                target: m.profile_id,
                type: 'mentions_profile' as const
            }));

            const projectMentionLinks: Link[] = (postProjects || []).map((pp: any) => ({
                source: `post-${pp.post_id}`,
                target: `project-${pp.project_id}`,
                type: 'mentions_project' as const
            }));

            const contributionLinks: Link[] = (contributions || []).map((c: any) => ({
                source: c.person_id,
                target: `project-${c.project_id}`,
                type: 'contributes' as const
            }));

            const allNodes = [...profileNodes, ...postNodes, ...projectNodes];
            const allLinks = [...authorLinks, ...mentionLinks, ...projectMentionLinks, ...contributionLinks];
            
            // Calculate connection counts for each node
            const connectionCounts: { [id: string]: number } = {};
            allNodes.forEach(node => {
                connectionCounts[node.id] = 0;
            });
            
            allLinks.forEach(link => {
                if (connectionCounts[link.source] !== undefined) {
                    connectionCounts[link.source]++;
                }
                if (connectionCounts[link.target] !== undefined) {
                    connectionCounts[link.target]++;
                }
            });
            
            setNodeConnectionCounts(connectionCounts);
            setGraphData({
                nodes: allNodes,
                links: allLinks,
            });
            setLoading(false);
        };
        fetchData();
    }, []);

    const handleZoomIn = () => {
        if (graphRef.current) {
            graphRef.current.zoom(1.2);
        }
    };

    const handleZoomOut = () => {
        if (graphRef.current) {
            graphRef.current.zoom(0.8);
        }
    };

    const handleZoomReset = () => {
        if (graphRef.current) {
            graphRef.current.zoomToFit(400);
        }
    };

    // Handle click outside search
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
                setShowSearchDropdown(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Search functionality
    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setSelectedSearchIndex(0);
        
        if (!query.trim()) {
            setSearchResults([]);
            setShowSearchDropdown(false);
            return;
        }
        
        const lowerQuery = query.toLowerCase();
        const results = graphData.nodes.filter(node => {
            if (node.type === 'profile') {
                return node.label.toLowerCase().includes(lowerQuery) ||
                       (node.title && node.title.toLowerCase().includes(lowerQuery)) ||
                       (node.location && node.location.toLowerCase().includes(lowerQuery));
            } else if (node.type === 'project') {
                return node.label.toLowerCase().includes(lowerQuery) ||
                       ((node as ProjectNode).description && (node as ProjectNode).description!.toLowerCase().includes(lowerQuery));
            } else if (node.type === 'post') {
                return node.label.toLowerCase().includes(lowerQuery) ||
                       ((node as PostNode).authorName && (node as PostNode).authorName!.toLowerCase().includes(lowerQuery));
            }
            return false;
        });
        
        setSearchResults(results.slice(0, 10)); // Limit to 10 results
        setShowSearchDropdown(results.length > 0);
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (!showSearchDropdown || searchResults.length === 0) return;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedSearchIndex(prev => 
                    prev < searchResults.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedSearchIndex(prev => 
                    prev > 0 ? prev - 1 : searchResults.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                selectSearchResult(searchResults[selectedSearchIndex]);
                break;
            case 'Escape':
                e.preventDefault();
                setShowSearchDropdown(false);
                break;
        }
    };

    const selectSearchResult = (node: GraphNode) => {
        // Navigate directly to the entity page
        if (node.type === 'profile') {
            router.push(`/profile/${node.id}`);
        } else if (node.type === 'project') {
            const projectId = node.id.replace('project-', '');
            router.push(`/projects/${projectId}`);
        }
        // Posts don't have individual pages yet
    };

    return (
        <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center px-6 py-4">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Knowledge Graph</h1>
                    
                    {/* Search Bar */}
                    <div className="relative flex-1 max-w-md mx-6" ref={searchInputRef}>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            onFocus={() => searchQuery && setShowSearchDropdown(searchResults.length > 0)}
                            placeholder="Search people, projects, or posts..."
                            className="w-full px-4 py-2 pl-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        />
                        <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        
                        {/* Search Dropdown */}
                        {showSearchDropdown && (
                            <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                                {searchResults.map((node, index) => (
                                    <button
                                        key={node.id}
                                        onClick={() => selectSearchResult(node)}
                                        onMouseEnter={() => setSelectedSearchIndex(index)}
                                        className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                                            index === selectedSearchIndex
                                                ? 'bg-blue-50 dark:bg-blue-900/30'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                            node.type === 'profile' ? 'bg-indigo-100 dark:bg-indigo-900' :
                                            node.type === 'project' ? 'bg-amber-100 dark:bg-amber-900' :
                                            'bg-emerald-100 dark:bg-emerald-900'
                                        }`}>
                                            <span className="text-sm">
                                                {node.type === 'profile' ? '👤' :
                                                 node.type === 'project' ? '📁' : '💬'}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 dark:text-white truncate">
                                                {node.label.length > 50 ? node.label.slice(0, 50) + '...' : node.label}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {node.type === 'profile' && (node as ProfileNode).title ? (node as ProfileNode).title :
                                                 node.type === 'project' ? 'Project' :
                                                 node.type === 'post' ? `by ${(node as PostNode).authorName}` : node.type}
                                            </p>
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {nodeConnectionCounts[node.id] || 0} connections
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Legend */}
                    <div className="flex gap-6 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">👤</span>
                            <span className="w-3 h-3 bg-indigo-500 rounded-full"></span>
                            <span className="text-gray-600 dark:text-gray-400">People</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">📁</span>
                            <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
                            <span className="text-gray-600 dark:text-gray-400">Projects</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">💬</span>
                            <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                            <span className="text-gray-600 dark:text-gray-400">Posts</span>
                        </div>
                    </div>
                </div>
            </div>
            {/* Main Content */}
            <div className="absolute inset-0 pt-16">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500 dark:text-gray-400">Loading graph...</p>
                    </div>
                ) : (
                    <div className="relative w-full h-full">
                        {/* Zoom Controls */}
                        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                            <button
                                onClick={handleZoomIn}
                                className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow hover:bg-gray-50 dark:hover:bg-gray-600"
                                title="Zoom In"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                                </svg>
                            </button>
                            <button
                                onClick={handleZoomOut}
                                className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow hover:bg-gray-50 dark:hover:bg-gray-600"
                                title="Zoom Out"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                                </svg>
                            </button>
                            <button
                                onClick={handleZoomReset}
                                className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow hover:bg-gray-50 dark:hover:bg-gray-600"
                                title="Reset View"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                </svg>
                            </button>
                        </div>
                        
                        {/* Instructions */}
                        <div className="absolute bottom-4 left-4 z-10 bg-white/90 dark:bg-gray-800/90 p-3 rounded-lg shadow-lg max-w-xs">
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                <strong>Click</strong> on people or projects to view details<br/>
                                <strong>Hover</strong> to highlight connections<br/>
                                <strong>Drag</strong> nodes to reorganize<br/>
                                <strong>Scroll</strong> to zoom, drag background to pan<br/>
                                <strong>Node size</strong> = number of connections
                            </p>
                        </div>
                        
                        <div className="w-full h-full bg-white dark:bg-gray-800">
                            <ForceGraph2D
                                graphData={graphData}
                                width={dimensions.width}
                                height={dimensions.height}
                            ref={graphRef}
                            nodeLabel={(node: any) => {
                                if (node.type === 'profile') {
                                    return `${node.label}${node.title ? '\n' + node.title : ''}${node.location ? '\n' + node.location : ''}`;
                                } else if (node.type === 'project') {
                                    return `${node.label}${node.status ? '\n' + node.status : ''}`;
                                } else if (node.type === 'post') {
                                    // Show truncated version for tooltip
                                    return node.label.length > 50 ? node.label.slice(0, 50) + '...' : node.label;
                                }
                                return node.label;
                            }}
                            onNodeClick={(node: any) => {
                                // Navigate directly to entity pages
                                if (node.type === 'profile') {
                                    router.push(`/profile/${node.id}`);
                                } else if (node.type === 'project') {
                                    const projectId = node.id.replace('project-', '');
                                    router.push(`/projects/${projectId}`);
                                }
                            }}
                            onNodeHover={(node: any) => setSelectedNode(node?.id || null)}
                            onBackgroundClick={() => setSelectedNode(null)}
                            enableZoomPanInteraction={true}
                            enableNodeDrag={true}
                            nodeCanvasObjectMode={() => 'replace'}
                            nodeCanvasObject={(node, ctx, globalScale) => {
                                const opacity = node.id && animatedNodeOpacities[node.id] !== undefined ? animatedNodeOpacities[node.id] : 1;
                                
                                // Different colors for each node type
                                let color = '#6366f1'; // default
                                let baseSize = 8;
                                let icon = '';
                                
                                if (node.type === 'profile') {
                                    color = '#6366f1'; // indigo for profiles
                                    baseSize = 8;
                                    icon = '👤';
                                } else if (node.type === 'project') {
                                    color = '#f59e0b'; // amber for projects
                                    baseSize = 10;
                                    icon = '📁';
                                } else if (node.type === 'post') {
                                    color = '#10b981'; // emerald for posts
                                    baseSize = 5;
                                    icon = '💬';
                                }
                                
                                // Calculate size based on connection count
                                const connectionCount = nodeConnectionCounts[node.id] || 0;
                                const size = Math.max(baseSize, Math.min(baseSize + (connectionCount * 1.5), 30));
                                
                                // Draw node circle
                                ctx.globalAlpha = opacity;
                                ctx.beginPath();
                                ctx.arc(node.x as number, node.y as number, size, 0, 2 * Math.PI, false);
                                ctx.fillStyle = color;
                                ctx.fill();
                                
                                // Add border for selected/hovered node
                                if (node.id === selectedNode) {
                                    ctx.strokeStyle = color;
                                    ctx.lineWidth = 3;
                                    ctx.stroke();
                                }
                                
                                // Draw icon
                                const iconSize = (size * 1.5) / globalScale;
                                ctx.font = `${iconSize}px serif`;
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillText(icon, node.x as number, node.y as number);
                                
                                // Draw label
                                let displayLabel = node.label;
                                if (node.type === 'post' && displayLabel.length > 20) {
                                    displayLabel = displayLabel.slice(0, 20) + '...';
                                }
                                const fontSize = 12 / globalScale;
                                ctx.font = `${fontSize}px Sans-Serif`;
                                ctx.textAlign = 'left';
                                ctx.textBaseline = 'middle';
                                ctx.fillStyle = opacity > 0.5 ? color : 'transparent';
                                ctx.fillText(displayLabel, (node.x as number) + size + 4, (node.y as number));
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
                                
                                // Different styles for different link types
                                const linkType = (link as any).type;
                                if (linkType === 'authored') {
                                    ctx.strokeStyle = '#6366f1';
                                    ctx.lineWidth = 2;
                                } else if (linkType === 'mentions_profile') {
                                    ctx.strokeStyle = '#8b5cf6';
                                    ctx.lineWidth = 1.5;
                                    ctx.setLineDash([5, 5]);
                                } else if (linkType === 'mentions_project') {
                                    ctx.strokeStyle = '#f59e0b';
                                    ctx.lineWidth = 1.5;
                                    ctx.setLineDash([5, 5]);
                                } else if (linkType === 'contributes') {
                                    ctx.strokeStyle = '#ef4444';
                                    ctx.lineWidth = 2;
                                } else {
                                    ctx.strokeStyle = '#888';
                                    ctx.lineWidth = 1.5;
                                }
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
                                let baseSize = 8;
                                if (node.type === 'profile') baseSize = 8;
                                else if (node.type === 'project') baseSize = 10;
                                else if (node.type === 'post') baseSize = 5;
                                
                                const connectionCount = nodeConnectionCounts[node.id] || 0;
                                const size = Math.max(baseSize, Math.min(baseSize + (connectionCount * 1.5), 30));
                                
                                ctx.beginPath();
                                ctx.arc(node.x as number, node.y as number, size, 0, 2 * Math.PI, false);
                                ctx.fillStyle = color;
                                ctx.fill();
                            }}
                        />
                        </div>
                        
                    </div>
                )}
            </div>
        </div>
    );
} 