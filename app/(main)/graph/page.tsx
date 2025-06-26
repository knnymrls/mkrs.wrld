'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { ZoomIn, ZoomOut, Maximize2, Filter, Users, Briefcase, MessageCircle, X, ChevronRight, Search } from 'lucide-react';
import Image from 'next/image';
import GraphModeSelector, { GraphMode } from '@/app/components/features/graph/GraphModeSelector';
import SkillRadarVisualization from '@/app/components/features/graph/SkillRadarVisualization';
import GraphControls from '@/app/components/features/graph/GraphControls';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface ProfileNode {
    id: string;
    label: string;
    type: 'profile';
    title?: string;
    location?: string;
    avatar_url?: string;
    skills?: string[];
}

interface PostNode {
    id: string;
    label: string;
    type: 'post';
    authorName?: string;
    created_at?: string;
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

interface FilterState {
    showProfiles: boolean;
    showPosts: boolean;
    showProjects: boolean;
    minConnections: number;
}

export default function GraphPage() {
    const router = useRouter();
    const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: Link[] }>({ nodes: [], links: [] });
    const [filteredData, setFilteredData] = useState<{ nodes: GraphNode[]; links: Link[] }>({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [clickedNode, setClickedNode] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [nodeConnectionCounts, setNodeConnectionCounts] = useState<{ [id: string]: number }>({});
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const graphRef = useRef<any>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        showProfiles: true,
        showPosts: false,
        showProjects: false,
        minConnections: 0
    });
    const [graphStats, setGraphStats] = useState({
        totalNodes: 0,
        totalEdges: 0,
        profileCount: 0,
        postCount: 0,
        projectCount: 0,
        avgConnections: 0,
        mostConnected: null as GraphNode | null
    });
    const [currentMode, setCurrentMode] = useState<GraphMode>('network');
    
    // New visibility controls - hide posts from the start
    const [showPeople, setShowPeople] = useState(true);
    const [showProjects, setShowProjects] = useState(true);
    const [showPosts, setShowPosts] = useState(false);
    const [connectionThreshold, setConnectionThreshold] = useState(0);

    // Update dimensions on window resize
    useEffect(() => {
        const updateDimensions = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };
        
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Sync filters with visibility controls
    useEffect(() => {
        setFilters({
            showProfiles: showPeople,
            showPosts: showPosts,
            showProjects: showProjects,
            minConnections: connectionThreshold
        });
    }, [showPeople, showPosts, showProjects, connectionThreshold]);

    // Compute related nodes for highlighting
    const relatedNodes = useMemo(() => {
        if (!hoveredNode || !filteredData) return new Set<string>();
        const related = new Set([hoveredNode]);
        
        filteredData.links.forEach(link => {
            const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
            const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
            
            if (sourceId === hoveredNode) related.add(targetId);
            if (targetId === hoveredNode) related.add(sourceId);
        });
        
        return related;
    }, [hoveredNode, filteredData]);

    // Apply filters to graph data
    useEffect(() => {
        if (!graphData.nodes.length) return;

        const filteredNodes = graphData.nodes.filter(node => {
            // Type filter
            if (node.type === 'profile' && !filters.showProfiles) return false;
            if (node.type === 'post' && !filters.showPosts) return false;
            if (node.type === 'project' && !filters.showProjects) return false;
            
            // Connection count filter
            const connections = nodeConnectionCounts[node.id] || 0;
            if (connections < filters.minConnections) return false;
            
            return true;
        });

        const nodeIds = new Set(filteredNodes.map(n => n.id));
        const filteredLinks = graphData.links.filter(link => {
            const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
            const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
            return nodeIds.has(sourceId) && nodeIds.has(targetId);
        });

        setFilteredData({ nodes: filteredNodes, links: filteredLinks });
    }, [graphData, filters, nodeConnectionCounts]);

    // Calculate graph statistics
    useEffect(() => {
        if (!filteredData.nodes.length) return;

        const profileCount = filteredData.nodes.filter(n => n.type === 'profile').length;
        const postCount = filteredData.nodes.filter(n => n.type === 'post').length;
        const projectCount = filteredData.nodes.filter(n => n.type === 'project').length;
        
        const totalConnections = Object.values(nodeConnectionCounts).reduce((sum, count) => sum + count, 0);
        const avgConnections = totalConnections / filteredData.nodes.length;
        
        let mostConnected = null;
        let maxConnections = 0;
        filteredData.nodes.forEach(node => {
            const connections = nodeConnectionCounts[node.id] || 0;
            if (connections > maxConnections) {
                maxConnections = connections;
                mostConnected = node;
            }
        });

        setGraphStats({
            totalNodes: filteredData.nodes.length,
            totalEdges: filteredData.links.length,
            profileCount,
            postCount,
            projectCount,
            avgConnections: Math.round(avgConnections * 10) / 10,
            mostConnected
        });
    }, [filteredData, nodeConnectionCounts]);

    useEffect(() => {
        const fetchData = async () => {
            // Fetch all data in parallel
            const [
                { data: profiles, error: profilesError },
                { data: posts, error: postsError },
                { data: projects, error: projectsError },
                { data: postMentions, error: postMentionsError },
                { data: postProjects, error: postProjectsError },
                { data: contributions, error: contributionsError },
                { data: skills, error: skillsError }
            ] = await Promise.all([
                supabase.from('profiles').select('id, name, title, location, avatar_url'),
                supabase.from('posts').select('id, author_id, content, created_at'),
                supabase.from('projects').select('id, title, description, status'),
                supabase.from('post_mentions').select('post_id, profile_id'),
                supabase.from('post_projects').select('post_id, project_id'),
                supabase.from('contributions').select('person_id, project_id, role'),
                supabase.from('skills').select('profile_id, skill')
            ]);

            if (profilesError || postsError || projectsError) {
                console.error('Error fetching data:', { profilesError, postsError, projectsError });
                setLoading(false);
                return;
            }

            // Create profile ID to name map for post labels
            const profileMap = new Map((profiles || []).map(p => [p.id, p.name]));

            // Group skills by profile
            const profileSkills = new Map<string, string[]>();
            (skills || []).forEach((s: any) => {
                if (!profileSkills.has(s.profile_id)) {
                    profileSkills.set(s.profile_id, []);
                }
                profileSkills.get(s.profile_id)!.push(s.skill);
            });

            // Create nodes
            const profileNodes: ProfileNode[] = (profiles || []).map((p: any) => ({
                id: p.id,
                label: p.name || 'Unnamed',
                type: 'profile',
                title: p.title,
                location: p.location,
                avatar_url: p.avatar_url,
                skills: profileSkills.get(p.id) || []
            }));

            const postNodes: PostNode[] = (posts || []).map((p: any) => ({
                id: `post-${p.id}`,
                label: p.content || 'Post',
                type: 'post',
                authorName: profileMap.get(p.author_id) || 'Unknown',
                created_at: p.created_at
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

    const handleNodeClick = useCallback((node: any) => {
        // Set the clicked node to show the popup
        setClickedNode(node.id);
    }, []);

    const handleZoomIn = () => {
        if (graphRef.current) {
            graphRef.current.zoom(1.5, 400);
        }
    };

    const handleZoomOut = () => {
        if (graphRef.current) {
            graphRef.current.zoom(0.7, 400);
        }
    };

    const handleZoomReset = () => {
        if (graphRef.current) {
            graphRef.current.zoomToFit(400, 200);
        }
    };




    // Search functionality with focus
    const handleSearch = (query: string) => {
        setSearchQuery(query);
        
        if (!query.trim()) {
            setHoveredNode(null);
            return;
        }
        
        const lowerQuery = query.toLowerCase();
        const profileMatch = filteredData.nodes.find(node => 
            node.type === 'profile' && 
            node.label.toLowerCase().includes(lowerQuery)
        );
        
        if (profileMatch) {
            // Highlight the matched node
            setHoveredNode(profileMatch.id);
            
            // Center and zoom on the node if graph is ready
            if (graphRef.current && (profileMatch as any).x !== undefined) {
                graphRef.current.centerAt((profileMatch as any).x, (profileMatch as any).y, 1000);
                graphRef.current.zoom(2, 1000);
            }
        } else {
            setHoveredNode(null);
        }
    };


    const navigateToNode = (node: GraphNode) => {
        if (node.type === 'profile') {
            router.push(`/profile/${node.id}`);
        } else if (node.type === 'project') {
            const projectId = node.id.replace('project-', '');
            router.push(`/projects/${projectId}`);
        }
    };


    return (
        <div className="relative w-full h-screen bg-surface-bright overflow-hidden">
            {/* Clean Header */}
            <div className="absolute top-0 left-0 right-0 z-30 bg-surface-bright border-b border-border">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h1 className="text-xl font-semibold text-onsurface-primary">Knowledge Graph</h1>
                            <GraphModeSelector 
                                currentMode={currentMode}
                                onModeChange={setCurrentMode}
                            />
                        </div>
                        
                        {/* Simple Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-onsurface-secondary" />
                            <input
                                type="text"
                                placeholder="Find person..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    handleSearch(e.target.value);
                                }}
                                className="pl-9 pr-4 py-1.5 text-sm bg-surface-container rounded-lg border border-border focus:outline-none focus:border-primary w-48"
                            />
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`p-2 rounded-lg transition-colors ${
                                    showFilters 
                                        ? 'bg-primary/10 text-primary' 
                                        : 'text-onsurface-secondary hover:bg-surface-container-muted'
                                }`}
                            >
                                <Filter size={20} />
                            </button>
                            <button
                                onClick={handleZoomReset}
                                className="p-2 rounded-lg text-onsurface-secondary hover:bg-surface-container-muted transition-colors"
                                title="Reset view"
                            >
                                <Maximize2 size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Legacy Search Bar - Hidden but kept for compatibility */}
            <div className="hidden" ref={searchInputRef}></div>

            {/* Main Content */}
            <div className="relative w-full h-full pt-[73px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="text-center">
                            <div className="text-4xl mb-2">🔗</div>
                            <p className="text-sm text-onsurface-secondary">Loading knowledge graph...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Graph Controls */}
                        {showFilters && (
                            <GraphControls
                                showPeople={showPeople}
                                showProjects={showProjects}
                                showPosts={showPosts}
                                onTogglePeople={() => setShowPeople(!showPeople)}
                                onToggleProjects={() => setShowProjects(!showProjects)}
                                onTogglePosts={() => setShowPosts(!showPosts)}
                                connectionThreshold={connectionThreshold}
                                onConnectionThresholdChange={setConnectionThreshold}
                            />
                        )}

                        {/* Zoom Controls - minimal style */}
                        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1">
                            <button
                                onClick={handleZoomIn}
                                className="p-1.5 bg-surface-bright/80 backdrop-blur-sm rounded-md hover:bg-surface-container transition-colors border border-border/50"
                                title="Zoom In"
                            >
                                <ZoomIn className="w-4 h-4 text-onsurface-secondary" />
                            </button>
                            <button
                                onClick={handleZoomOut}
                                className="p-1.5 bg-surface-bright/80 backdrop-blur-sm rounded-md hover:bg-surface-container transition-colors border border-border/50"
                                title="Zoom Out"
                            >
                                <ZoomOut className="w-4 h-4 text-onsurface-secondary" />
                            </button>
                        </div>

                        {/* Node Details Panel - Show on hover or click */}
                        {(hoveredNode || clickedNode) && (() => {
                            const nodeId = clickedNode || hoveredNode;
                            const nodeData = filteredData.nodes.find(n => n.id === nodeId);
                            if (!nodeData) return null;
                            
                            return (
                                <div className={`absolute top-20 right-4 z-20 bg-surface-bright/80 backdrop-blur-md rounded-lg border border-border p-4 w-64 ${clickedNode ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3 flex-1">
                                            {nodeData.type === 'profile' && (nodeData as ProfileNode).avatar_url ? (
                                                <Image
                                                    src={(nodeData as ProfileNode).avatar_url!}
                                                    alt={nodeData.label}
                                                    width={40}
                                                    height={40}
                                                    className="rounded-full"
                                                />
                                            ) : (
                                                <div className={`text-2xl`}>
                                                    {nodeData.type === 'profile' ? '👤' :
                                                     nodeData.type === 'project' ? '🚀' : 
                                                     '💬'}
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <h3 className="font-medium text-onsurface-primary text-sm">
                                                    {nodeData.label.length > 30 ? nodeData.label.slice(0, 30) + '...' : nodeData.label}
                                                </h3>
                                                <p className="text-xs text-onsurface-secondary capitalize">
                                                    {nodeData.type}
                                                </p>
                                            </div>
                                        </div>
                                        {clickedNode && (nodeData.type === 'profile' || nodeData.type === 'project') && (
                                            <button
                                                onClick={() => {
                                                    if (nodeData.type === 'profile') {
                                                        router.push(`/profile/${nodeData.id}`);
                                                    } else if (nodeData.type === 'project') {
                                                        const projectId = nodeData.id.replace('project-', '');
                                                        router.push(`/projects/${projectId}`);
                                                    }
                                                }}
                                                className="p-1.5 text-onsurface-secondary hover:text-onsurface-primary transition-colors rounded-md hover:bg-surface-container-muted"
                                                title="View full page"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        {nodeData.type === 'profile' && (
                                            <>
                                                {(nodeData as ProfileNode).title && (
                                                    <div className="text-onsurface-secondary">
                                                        {(nodeData as ProfileNode).title}
                                                    </div>
                                                )}
                                                {(nodeData as ProfileNode).location && (
                                                    <div className="text-onsurface-secondary">
                                                        📍 {(nodeData as ProfileNode).location}
                                                    </div>
                                                )}
                                                {(nodeData as ProfileNode).skills && (nodeData as ProfileNode).skills!.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {(nodeData as ProfileNode).skills!.slice(0, 4).map((skill, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-surface-container-muted text-onsurface-secondary text-xs rounded">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                        {(nodeData as ProfileNode).skills!.length > 4 && (
                                                            <span className="text-xs text-onsurface-secondary">
                                                                +{(nodeData as ProfileNode).skills!.length - 4}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {nodeData.type === 'project' && (
                                            <>
                                                {(nodeData as ProjectNode).status && (
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${
                                                            (nodeData as ProjectNode).status === 'active' ? 'bg-green-500' :
                                                            (nodeData as ProjectNode).status === 'paused' ? 'bg-yellow-500' :
                                                            'bg-gray-400'
                                                        }`} />
                                                        <span className="text-onsurface-secondary capitalize">
                                                            {(nodeData as ProjectNode).status}
                                                        </span>
                                                    </div>
                                                )}
                                                {(nodeData as ProjectNode).description && (
                                                    <p className="text-onsurface-secondary text-xs line-clamp-2">
                                                        {(nodeData as ProjectNode).description}
                                                    </p>
                                                )}
                                            </>
                                        )}

                                        {nodeData.type === 'post' && (
                                            <>
                                                <div className="text-onsurface-secondary">
                                                    by {(nodeData as PostNode).authorName}
                                                </div>
                                                {(nodeData as PostNode).created_at && (
                                                    <div className="text-onsurface-secondary text-xs">
                                                        {new Date((nodeData as PostNode).created_at!).toLocaleDateString()}
                                                    </div>
                                                )}
                                                <p className="text-onsurface-secondary text-xs line-clamp-3">
                                                    {nodeData.label}
                                                </p>
                                            </>
                                        )}

                                        <div className="pt-2 mt-2 border-t border-border/50 flex items-center justify-between">
                                            <span className="text-xs text-onsurface-secondary">Connections</span>
                                            <span className="text-xs font-medium text-onsurface-primary">
                                                {nodeConnectionCounts[nodeData.id] || 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Graph Canvas - Mode-specific rendering */}
                        <div className="w-full h-full">
                            {currentMode === 'skill-radar' ? (
                                <SkillRadarVisualization
                                    graphData={graphData}
                                    dimensions={dimensions}
                                    onNodeClick={handleNodeClick}
                                    onNodeHover={(node: any) => setHoveredNode(node?.id || null)}
                                />
                            ) : (
                                <div className="w-full h-full">
                                    <ForceGraph2D
                                ref={graphRef}
                                graphData={filteredData}
                                width={dimensions.width}
                                height={dimensions.height - 73}
                                backgroundColor="transparent"
                                nodeLabel={() => ''}
                                onNodeClick={handleNodeClick}
                                onNodeHover={(node: any) => setHoveredNode(node?.id || null)}
                                onBackgroundClick={() => {
                                    setHoveredNode(null);
                                    setClickedNode(null);
                                }}
                                cooldownTicks={300}
                                minZoom={0.1}
                                maxZoom={4}
                                enableZoomInteraction={true}
                                enableNodeDrag={true}
                                d3AlphaDecay={0.001}
                                d3VelocityDecay={0.02}
                                linkDistance={2000}
                                linkStrength={0.001}
                                chargeStrength={-30000}
                                nodeCanvasObjectMode={() => 'after'}
                                nodeCanvasObject={(node, ctx, globalScale) => {
                                    const isRelated = !hoveredNode || relatedNodes.has(node.id as string);
                                    const isHovered = node.id === hoveredNode;
                                    
                                    // Node styling based on type with emojis
                                    let color = '#3B82F6'; // blue
                                    let baseSize = 5;
                                    let emoji = '';
                                    
                                    if (node.type === 'profile') {
                                        color = '#3B82F6'; // blue
                                        baseSize = 8; // Smaller for less overlap
                                    } else if (node.type === 'project') {
                                        color = '#F59E0B'; // amber
                                        baseSize = 10;
                                        emoji = '🚀'; // Project emoji
                                    } else if (node.type === 'post') {
                                        color = '#10B981'; // emerald
                                        baseSize = 4; // Smaller posts
                                        emoji = '💬'; // Post emoji
                                    }
                                    
                                    // Size based on connections
                                    const connections = nodeConnectionCounts[node.id as string] || 0;
                                    const size = baseSize + Math.sqrt(connections) * 2;
                                    
                                    // Opacity for non-related nodes - 10% when hovering
                                    ctx.globalAlpha = isRelated ? 1 : 0.1;
                                    
                                    // Draw profile nodes with images
                                    if (node.type === 'profile' && (node as ProfileNode).avatar_url) {
                                        // Create a circular clipping mask
                                        ctx.save();
                                        ctx.beginPath();
                                        ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
                                        ctx.clip();
                                        
                                        // Draw image if already loaded
                                        const avatarUrl = (node as ProfileNode).avatar_url!;
                                        let img = (node as any).__img;
                                        
                                        if (!img) {
                                            // Create and cache the image
                                            img = new (window as any).Image();
                                            img.crossOrigin = 'anonymous';
                                            img.src = avatarUrl;
                                            (node as any).__img = img;
                                            
                                            // Draw placeholder while loading
                                            ctx.fillStyle = color;
                                            ctx.fillRect(node.x! - size, node.y! - size, size * 2, size * 2);
                                            
                                            // Force re-render when image loads
                                            img.onload = () => {
                                                // No need to refresh, it will update on next frame
                                            };
                                        } else if (img.complete && img.naturalWidth > 0) {
                                            // Draw the loaded image
                                            ctx.drawImage(img, node.x! - size, node.y! - size, size * 2, size * 2);
                                        } else {
                                            // Still loading, draw placeholder
                                            ctx.fillStyle = color;
                                            ctx.fillRect(node.x! - size, node.y! - size, size * 2, size * 2);
                                        }
                                        
                                        ctx.restore();
                                        
                                        // Draw border
                                        ctx.beginPath();
                                        ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
                                        ctx.strokeStyle = isHovered ? color : '#E5E7EB';
                                        ctx.lineWidth = isHovered ? 3 : 2;
                                        ctx.stroke();
                                    } else {
                                        // Skip rendering if node position is not initialized
                                        if (!isFinite(node.x!) || !isFinite(node.y!)) return;
                                        
                                        // Draw regular node with more visual appeal
                                        ctx.beginPath();
                                        ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
                                        
                                        // Simple solid color instead of gradient to avoid errors
                                        ctx.fillStyle = color;
                                        ctx.fill();
                                        
                                        // Border
                                        ctx.strokeStyle = isHovered ? '#ffffff' : color + '40';
                                        ctx.lineWidth = isHovered ? 3 : 2;
                                        ctx.stroke();
                                        
                                        // Draw emoji for projects and posts
                                        if (emoji) {
                                            ctx.font = `${Math.max(size * 0.8, 12)}px Inter, sans-serif`;
                                            ctx.textAlign = 'center';
                                            ctx.textBaseline = 'middle';
                                            ctx.fillText(emoji, node.x!, node.y!);
                                        }
                                    }
                                    
                                    // Draw label for all nodes with better styling
                                    if ((node.type === 'profile' || node.type === 'project' || (isHovered && node.type === 'post')) && 
                                        isFinite(node.x!) && isFinite(node.y!)) {
                                        ctx.globalAlpha = isRelated ? 1 : 0.1; // 10% opacity for non-related labels
                                        const label = node.label && node.label.length > 25 ? node.label.slice(0, 25) + '...' : node.label;
                                        
                                        // Scale font size based on zoom level
                                        const baseFontSize = node.type === 'profile' ? 11 : 10;
                                        const fontSize = Math.max(baseFontSize / globalScale, 8); // Min 8px, scales with zoom
                                        ctx.font = `${fontSize}px Inter, sans-serif`;
                                        
                                        const padding = 4;
                                        const bgY = node.y! + size + 4;
                                        
                                        // Use proper text color classes
                                        ctx.fillStyle = '#6B7280'; // text-onsurface-secondary equivalent
                                        ctx.textAlign = 'center';
                                        ctx.textBaseline = 'top';
                                        ctx.fillText(label as string, node.x!, bgY + padding);
                                    }
                                    
                                    ctx.globalAlpha = 1;
                                }}
                                linkCanvasObjectMode={() => 'after'}
                                linkCanvasObject={(link, ctx) => {
                                    const source = link.source as any;
                                    const target = link.target as any;
                                    
                                    if (!source.id || !target.id || !isFinite(source.x) || !isFinite(source.y) || 
                                        !isFinite(target.x) || !isFinite(target.y)) return;
                                    
                                    const isRelated = !hoveredNode || (relatedNodes.has(source.id) && relatedNodes.has(target.id));
                                    
                                    ctx.globalAlpha = isRelated ? 0.3 : 0.05;
                                    
                                    // More vibrant colored links like Capacities
                                    let linkColor = '#374151'; // Default gray
                                    let lineWidth = 1;
                                    let dashPattern: number[] = [];
                                    
                                    switch ((link as any).type) {
                                        case 'authored':
                                            linkColor = '#3B82F6'; // Blue solid
                                            lineWidth = 2;
                                            break;
                                        case 'mentions_profile':
                                            linkColor = '#8B5CF6'; // Purple dashed
                                            lineWidth = 2;
                                            dashPattern = [5, 5];
                                            break;
                                        case 'mentions_project':
                                            linkColor = '#F59E0B'; // Orange dashed
                                            lineWidth = 2;
                                            dashPattern = [5, 5];
                                            break;
                                        case 'contributes':
                                            linkColor = '#EF4444'; // Red solid
                                            lineWidth = 3;
                                            break;
                                    }
                                    
                                    ctx.strokeStyle = linkColor;
                                    ctx.lineWidth = lineWidth;
                                    ctx.globalAlpha = isRelated ? 0.5 : 0.02; // Even more subtle for non-related links
                                    
                                    if (dashPattern.length > 0) {
                                        ctx.setLineDash(dashPattern);
                                    }
                                    
                                    ctx.beginPath();
                                    ctx.moveTo(source.x, source.y);
                                    ctx.lineTo(target.x, target.y);
                                    ctx.stroke();
                                    ctx.setLineDash([]);
                                    ctx.globalAlpha = 1;
                                }}
                                nodePointerAreaPaint={(node, color, ctx) => {
                                    // Skip if coordinates not ready
                                    if (!isFinite(node.x!) || !isFinite(node.y!)) return;
                                    
                                    // Make the entire node clickable
                                    let baseSize = 5;
                                    
                                    if (node.type === 'profile') {
                                        baseSize = 8;
                                    } else if (node.type === 'project') {
                                        baseSize = 10;
                                    } else if (node.type === 'post') {
                                        baseSize = 4;
                                    }
                                    
                                    const connections = nodeConnectionCounts[node.id as string] || 0;
                                    const size = baseSize + Math.sqrt(connections) * 2;
                                    
                                    ctx.fillStyle = color;
                                    ctx.beginPath();
                                    ctx.arc(node.x!, node.y!, size + 2, 0, 2 * Math.PI); // Add 2px padding for easier clicking
                                    ctx.fill();
                                }}
                                d3AlphaDecay={0.001}
                                d3VelocityDecay={0.02}
                                warmupTicks={1000}
                                onEngineStop={() => {
                                    // Auto zoom out to see all nodes
                                    if (graphRef.current) {
                                        setTimeout(() => {
                                            graphRef.current.zoomToFit(400, 250);
                                        }, 100);
                                    }
                                }}
                                enablePanInteraction={true}
                                enableZoomInteraction={true}
                            />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

        </div>
    );
}