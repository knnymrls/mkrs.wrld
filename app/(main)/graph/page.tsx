'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { ZoomIn, ZoomOut, Maximize2, Filter, Users, Briefcase, MessageCircle, X, ChevronRight, Search } from 'lucide-react';
import Image from 'next/image';
import GraphModeSelector, { GraphMode } from '@/app/components/features/graph/GraphModeSelector';
import SkillRadarVisualization from '@/app/components/features/graph/SkillRadarVisualization';
import EnhancedGraphControls from '@/app/components/features/graph/EnhancedGraphControls';
import DivisionLegend from '@/app/components/features/graph/DivisionLegend';
import { getDivisionColor, NELNET_DIVISIONS } from '@/lib/constants/divisions';
import { calculateDivisionGroups } from '@/lib/graph/divisionGrouping';
import { ProfileNode, PostNode, ProjectNode, GraphNode } from '@/app/types/graph';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface Link {
    source: string;
    target: string;
    type: 'authored' | 'mentions_profile' | 'mentions_project' | 'contributes';
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
    
    // New visibility controls - show posts by default now
    const [showPeople, setShowPeople] = useState(true);
    const [showProjects, setShowProjects] = useState(true);
    const [showPosts, setShowPosts] = useState(true);
    const [connectionThreshold, setConnectionThreshold] = useState(0);
    const [selectedDivisions, setSelectedDivisions] = useState<string[]>([...NELNET_DIVISIONS]);
    const [showLegend, setShowLegend] = useState(true);
    const [showDivisionGroups, setShowDivisionGroups] = useState(false);

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

        console.log('Filtering nodes:', {
            totalNodes: graphData.nodes.length,
            showPeople,
            showPosts,
            showProjects,
            selectedDivisions
        });

        const filteredNodes = graphData.nodes.filter(node => {
            // Type filter
            if (node.type === 'profile' && !showPeople) return false;
            if (node.type === 'post' && !showPosts) return false;
            if (node.type === 'project' && !showProjects) return false;
            
            // Division filter for profiles
            if (node.type === 'profile') {
                const profileNode = node as ProfileNode;
                console.log('Profile division check:', {
                    name: profileNode.label,
                    division: profileNode.division,
                    selectedDivisions,
                    isIncluded: profileNode.division ? selectedDivisions.includes(profileNode.division) : false
                });
                // If no division is set, include if "Other" is selected
                if (!profileNode.division) {
                    if (!selectedDivisions.includes('Other')) return false;
                } else {
                    // Check if profile's division is selected
                    if (!selectedDivisions.includes(profileNode.division)) return false;
                }
            }
            
            // Connection count filter
            const connections = nodeConnectionCounts[node.id] || 0;
            if (connections < connectionThreshold) return false;
            
            return true;
        });

        const nodeIds = new Set(filteredNodes.map(n => n.id));
        const filteredLinks = graphData.links.filter(link => {
            const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
            const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
            return nodeIds.has(sourceId) && nodeIds.has(targetId);
        });

        console.log('Filtered results:', {
            filteredNodes: filteredNodes.length,
            filteredProfiles: filteredNodes.filter(n => n.type === 'profile').length,
            filteredPosts: filteredNodes.filter(n => n.type === 'post').length,
            filteredProjects: filteredNodes.filter(n => n.type === 'project').length
        });

        setFilteredData({ nodes: filteredNodes, links: filteredLinks });
    }, [graphData, showPeople, showPosts, showProjects, connectionThreshold, nodeConnectionCounts, selectedDivisions]);

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
                supabase.from('profiles').select('id, name, title, location, avatar_url, division, department, team'),
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
                type: 'profile' as const,
                group: 1,
                value: 1,
                title: p.title,
                location: p.location,
                avatar_url: p.avatar_url,
                skills: profileSkills.get(p.id) || [],
                division: p.division,
                department: p.department,
                team: p.team
            }));

            const postNodes: PostNode[] = (posts || []).map((p: any) => ({
                id: `post-${p.id}`,
                label: p.content || 'Post',
                type: 'post' as const,
                group: 2,
                value: 1,
                authorName: profileMap.get(p.author_id) || 'Unknown',
                created_at: p.created_at
            }));

            const projectNodes: ProjectNode[] = (projects || []).map((p: any) => ({
                id: `project-${p.id}`,
                label: p.title || 'Untitled Project',
                type: 'project' as const,
                group: 3,
                value: 1,
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
            
            console.log('Graph data loaded:', {
                profiles: profileNodes.length,
                posts: postNodes.length,
                projects: projectNodes.length,
                totalNodes: allNodes.length,
                totalLinks: allLinks.length,
                showPeople,
                showPosts,
                showProjects
            });
            
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
            graphRef.current.zoom(1.3, 300);
        }
    };

    const handleZoomOut = () => {
        if (graphRef.current) {
            graphRef.current.zoom(0.8, 300);
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
        <div className="relative w-full h-screen bg-[#0A0A0B] overflow-hidden">
            {/* Controls */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                <GraphModeSelector mode={currentMode} onModeChange={setCurrentMode} />
                
                {currentMode === 'network' && (
                    <>
                        {/* Search */}
                        <div className="bg-gray-900/90 backdrop-blur rounded-lg p-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search nodes..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        handleSearch(e.target.value);
                                    }}
                                    className="w-full pl-8 pr-3 py-1.5 bg-gray-800/50 text-white text-sm rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Filter Button */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="bg-gray-900/90 backdrop-blur text-white p-2 rounded-lg hover:bg-gray-800/90 transition-colors flex items-center gap-2"
                        >
                            <Filter className="w-4 h-4" />
                            <span className="text-sm">Filters</span>
                        </button>
                    </>
                )}
            </div>
            {/* Zoom Controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                <button
                    onClick={handleZoomIn}
                    className="bg-gray-900/90 backdrop-blur text-white p-2 rounded-lg hover:bg-gray-800/90 transition-colors"
                    title="Zoom In"
                >
                    <ZoomIn className="w-4 h-4" />
                </button>
                <button
                    onClick={handleZoomOut}
                    className="bg-gray-900/90 backdrop-blur text-white p-2 rounded-lg hover:bg-gray-800/90 transition-colors"
                    title="Zoom Out"
                >
                    <ZoomOut className="w-4 h-4" />
                </button>
                <button
                    onClick={handleZoomReset}
                    className="bg-gray-900/90 backdrop-blur text-white p-2 rounded-lg hover:bg-gray-800/90 transition-colors"
                    title="Reset Zoom"
                >
                    <Maximize2 className="w-4 h-4" />
                </button>
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
                            <EnhancedGraphControls
                                showPeople={showPeople}
                                showProjects={showProjects}
                                showPosts={showPosts}
                                onTogglePeople={() => setShowPeople(!showPeople)}
                                onToggleProjects={() => setShowProjects(!showProjects)}
                                onTogglePosts={() => setShowPosts(!showPosts)}
                                connectionThreshold={connectionThreshold}
                                onConnectionThresholdChange={setConnectionThreshold}
                                selectedDivisions={selectedDivisions}
                                onDivisionToggle={(division) => {
                                    setSelectedDivisions(prev => 
                                        prev.includes(division) 
                                            ? prev.filter(d => d !== division)
                                            : [...prev, division]
                                    );
                                }}
                                onClearDivisions={() => setSelectedDivisions([])}
                                onSelectAllDivisions={() => setSelectedDivisions([...NELNET_DIVISIONS])}
                                showDivisionGroups={showDivisionGroups}
                                onToggleDivisionGroups={() => setShowDivisionGroups(!showDivisionGroups)}
                            />
                        )}

                        {/* Zoom Controls - minimal style */}
                        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1">
                            <button
                                onClick={handleZoomIn}
                                className="p-2 bg-surface-bright/80 backdrop-blur-sm rounded-md hover:bg-surface-container transition-colors border border-border/50 active:scale-95"
                                title="Zoom In (Scroll or Pinch to zoom)"
                            >
                                <ZoomIn className="w-5 h-5 text-onsurface-secondary" />
                            </button>
                            <button
                                onClick={handleZoomOut}
                                className="p-2 bg-surface-bright/80 backdrop-blur-sm rounded-md hover:bg-surface-container transition-colors border border-border/50 active:scale-95"
                                title="Zoom Out (Scroll or Pinch to zoom)"
                            >
                                <ZoomOut className="w-5 h-5 text-onsurface-secondary" />
                            </button>
                            <button
                                onClick={handleZoomReset}
                                className="p-2 bg-surface-bright/80 backdrop-blur-sm rounded-md hover:bg-surface-container transition-colors border border-border/50 active:scale-95"
                                title="Fit to screen"
                            >
                                <Maximize2 className="w-5 h-5 text-onsurface-secondary" />
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
                                                {(nodeData as ProfileNode).division && (
                                                    <div className="flex items-center gap-2">
                                                        <div 
                                                            className="w-3 h-3 rounded-full" 
                                                            style={{ backgroundColor: getDivisionColor((nodeData as ProfileNode).division) }}
                                                        />
                                                        <span className="text-onsurface-secondary">
                                                            {(nodeData as ProfileNode).division}
                                                        </span>
                                                    </div>
                                                )}
                                                {(nodeData as ProfileNode).team && (
                                                    <div className="text-onsurface-secondary text-xs">
                                                        Team: {(nodeData as ProfileNode).team}
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
                                nodeRelSize={0}
                                nodeVal={() => 0}
                                nodeColor={() => 'transparent'}
                                onNodeClick={handleNodeClick}
                                onNodeHover={(node: any) => setHoveredNode(node?.id || null)}
                                onBackgroundClick={() => {
                                    setHoveredNode(null);
                                    setClickedNode(null);
                                }}
                                cooldownTicks={100}
                                minZoom={0.1}
                                maxZoom={4}
                                enableZoomInteraction={true}
                                enableNodeDrag={true}
                                d3AlphaDecay={0.02}
                                d3VelocityDecay={0.4}
                                onRenderFramePre={(ctx, globalScale) => {
                                    if (!showDivisionGroups || !showPeople) return;
                                    
                                    // Draw division group bubbles
                                    const groups = calculateDivisionGroups(filteredData.nodes, selectedDivisions);
                                    
                                    ctx.save();
                                    groups.forEach(group => {
                                        if (group.nodes.length < 2) return; // Don't draw bubble for single nodes
                                        
                                        const color = getDivisionColor(group.division);
                                        
                                        // Draw translucent circle
                                        ctx.beginPath();
                                        ctx.arc(group.center.x, group.center.y, group.radius, 0, 2 * Math.PI);
                                        ctx.fillStyle = color + '10'; // 10% opacity
                                        ctx.fill();
                                        
                                        // Draw border
                                        ctx.strokeStyle = color + '30'; // 30% opacity
                                        ctx.lineWidth = 2 / globalScale; // Adjust line width based on zoom
                                        ctx.stroke();
                                        
                                        // Draw label if zoomed out enough
                                        if (globalScale > 0.3) {
                                            ctx.font = `${14 / globalScale}px Inter, sans-serif`;
                                            ctx.fillStyle = color;
                                            ctx.textAlign = 'center';
                                            ctx.textBaseline = 'bottom';
                                            ctx.fillText(group.division, group.center.x, group.center.y - group.radius - 5);
                                        }
                                    });
                                    ctx.restore();
                                }}
                                nodeCanvasObjectMode={() => 'replace'}
                                nodeCanvasObject={(node, ctx, globalScale) => {
                                    const isRelated = !hoveredNode || relatedNodes.has(node.id as string);
                                    const isHovered = node.id === hoveredNode;
                                    
                                    // Draw non-hovered nodes first (lower z-index)
                                    if (hoveredNode && !isHovered && !isRelated) {
                                        // These will be drawn with lower opacity
                                    }
                                    
                                    // Node styling based on type - colored nodes
                                    let color = '#ffffff'; // Default white
                                    let ringColor = null; // Division color for profiles
                                    let baseSize = 4;
                                    
                                    if (node.type === 'profile') {
                                        // Use division color for profiles
                                        const profileNode = node as ProfileNode;
                                        ringColor = getDivisionColor(profileNode.division);
                                        color = '#ffffff'; // White center for profiles
                                        baseSize = 5;
                                    } else if (node.type === 'project') {
                                        color = '#F59E0B'; // yellow/amber
                                        baseSize = 5;
                                    } else if (node.type === 'post') {
                                        color = '#10B981'; // green for posts
                                        baseSize = 3;
                                    }
                                    
                                    // Size based on connections - smaller scaling
                                    const connections = nodeConnectionCounts[node.id as string] || 0;
                                    const size = baseSize + Math.sqrt(connections) * 0.8;
                                    
                                    // Opacity: 100% normal for nodes, 10% for non-related when hovering
                                    if (!hoveredNode) {
                                        ctx.globalAlpha = 1; // Normal state - 100% opacity for nodes
                                    } else {
                                        ctx.globalAlpha = isRelated ? 1 : 0.1; // Hover state - 100% or 10%
                                    }
                                    
                                    // Skip rendering if node position is not initialized
                                    if (!isFinite(node.x!) || !isFinite(node.y!)) return;
                                    
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
                                            
                                            // Draw placeholder while loading - gray circle
                                            ctx.fillStyle = '#6B7280';
                                            ctx.fillRect(node.x! - size, node.y! - size, size * 2, size * 2);
                                        } else if (img.complete && img.naturalWidth > 0) {
                                            // Draw the loaded image
                                            ctx.drawImage(img, node.x! - size, node.y! - size, size * 2, size * 2);
                                        } else {
                                            // Still loading, draw placeholder
                                            ctx.fillStyle = '#6B7280';
                                            ctx.fillRect(node.x! - size, node.y! - size, size * 2, size * 2);
                                        }
                                        
                                        ctx.restore();
                                        
                                        // Draw division ring for profile with image
                                        if (ringColor) {
                                            ctx.strokeStyle = ringColor;
                                            ctx.lineWidth = 2;
                                            ctx.beginPath();
                                            ctx.arc(node.x!, node.y!, size + 2, 0, 2 * Math.PI);
                                            ctx.stroke();
                                        }
                                    } else if (node.type === 'profile') {
                                        // Profile without image - draw circle with division color
                                        if (ringColor) {
                                            // Draw outer ring
                                            ctx.beginPath();
                                            ctx.arc(node.x!, node.y!, size + 2, 0, 2 * Math.PI);
                                            ctx.fillStyle = ringColor;
                                            ctx.fill();
                                        }
                                        
                                        // Draw inner white circle
                                        ctx.beginPath();
                                        ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
                                        ctx.fillStyle = '#ffffff';
                                        ctx.fill();
                                        
                                        // Draw profile icon
                                        ctx.fillStyle = '#6B7280';
                                        ctx.font = `${size * 1.2}px Arial`;
                                        ctx.textAlign = 'center';
                                        ctx.textBaseline = 'middle';
                                        ctx.fillText('👤', node.x!, node.y!);
                                    } else {
                                        // Non-profile nodes (projects and posts)
                                        ctx.beginPath();
                                        ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
                                        ctx.fillStyle = color;
                                        ctx.fill();
                                    }
                                    
                                    // Draw labels only when zoomed in - Obsidian style
                                    if ((node.type === 'profile' || node.type === 'project') && 
                                        isFinite(node.x!) && isFinite(node.y!) && globalScale < 0.7) {
                                        // Only show labels when zoomed in enough - 10% opacity for non-related
                                        const labelOpacity = Math.min((0.7 - globalScale) * 2, 1);
                                        if (!hoveredNode) {
                                            ctx.globalAlpha = labelOpacity; // Normal state - 100% of label opacity
                                        } else {
                                            ctx.globalAlpha = isRelated ? labelOpacity : labelOpacity * 0.1; // Hover state
                                        }
                                        const label = node.label && node.label.length > 30 ? node.label.slice(0, 30) + '...' : node.label;
                                        
                                        // Simple text, no badge
                                        const fontSize = 12;
                                        ctx.font = `400 ${fontSize}px Inter, sans-serif`;
                                        
                                        // Text color
                                        ctx.fillStyle = '#9CA3AF'; // gray-400
                                        ctx.textAlign = 'center';
                                        ctx.textBaseline = 'top';
                                        ctx.fillText(label as string, node.x!, node.y! + size + 5);
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
                                    
                                    // Lines - 50% normal, 100% for related, 10% for others when hovering
                                    ctx.strokeStyle = '#6B7280'; // text-onsurface-secondary
                                    ctx.lineWidth = 0.75; // Thinner lines
                                    if (!hoveredNode) {
                                        ctx.globalAlpha = 0.5; // Normal state - 50% opacity for lines
                                    } else {
                                        ctx.globalAlpha = isRelated ? 1 : 0.1; // Hover state - 100% or 10%
                                    }
                                    
                                    // Calculate arrow direction
                                    const dx = target.x - source.x;
                                    const dy = target.y - source.y;
                                    const distance = Math.sqrt(dx * dx + dy * dy);
                                    const unitX = dx / distance;
                                    const unitY = dy / distance;
                                    
                                    // Adjust for node radius - smaller sizes
                                    const baseSize = 3;
                                    const sourceRadius = nodeConnectionCounts[source.id] ? baseSize + Math.sqrt(nodeConnectionCounts[source.id]) * 0.8 : baseSize;
                                    const targetRadius = nodeConnectionCounts[target.id] ? baseSize + Math.sqrt(nodeConnectionCounts[target.id]) * 0.8 : baseSize;
                                    
                                    const startX = source.x + unitX * sourceRadius;
                                    const startY = source.y + unitY * sourceRadius;
                                    const endX = target.x - unitX * targetRadius;
                                    const endY = target.y - unitY * targetRadius;
                                    
                                    // Draw ultra minimal line without arrows
                                    ctx.beginPath();
                                    ctx.moveTo(startX, startY);
                                    ctx.lineTo(endX, endY);
                                    ctx.stroke();
                                    
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
                                warmupTicks={100}
                                onEngineStop={() => {
                                    // Auto zoom out to see all nodes
                                    if (graphRef.current) {
                                        setTimeout(() => {
                                            graphRef.current.zoomToFit(400, 250);
                                        }, 100);
                                    }
                                }}
                            />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Division Legend */}
            {currentMode === 'network' && selectedDivisions.length > 0 && (
                <div className="absolute bottom-4 right-4 z-10">
                    <DivisionLegend visibleDivisions={selectedDivisions} />
                </div>
            )}

        </div>
    );
}