'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { ZoomIn, ZoomOut, Maximize2, Filter, Users, Briefcase, MessageCircle, X, ChevronRight, Search } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import Image from 'next/image';
import GraphModeSelector, { GraphMode } from '@/app/components/features/graph/GraphModeSelector';
import SkillRadarVisualization from '@/app/components/features/graph/SkillRadarVisualization';
import EnhancedGraphControls from '@/app/components/features/graph/EnhancedGraphControls';
import { ProfileNode, PostNode, ProjectNode, GraphNode } from '@/app/types/graph';
import { useTheme } from '@/app/context/ThemeContext';
import { drawIcon } from '@/lib/graph/iconRenderer';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface Link {
    source: string;
    target: string;
    type: 'authored' | 'mentions_profile' | 'mentions_project' | 'contributes';
}


export default function GraphPage() {
    const router = useRouter();
    const { resolvedTheme } = useTheme();
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
    const [viewMode, setViewMode] = useState<'graph' | 'people'>('graph');

    // Theme-aware colors for canvas rendering - Bright, readable nodes
    const canvasColors = useMemo(() => {
        const isDark = resolvedTheme === 'dark';
        return {
            nodeDefault: isDark ? '#D1D5DB' : '#4B5563', // Brighter gray for better contrast
            nodeProfile: isDark ? '#C4B5FD' : '#9333EA', // Brighter purple - more vibrant
            nodeProject: isDark ? '#FCD34D' : '#F59E0B', // Brighter amber - more saturated
            nodePost: isDark ? '#6EE7B7' : '#10B981', // Brighter green - more vibrant
            placeholder: isDark ? '#9CA3AF' : '#D1D5DB', // Light gray placeholder
            label: isDark ? '#F3F4F6' : '#374151', // Darker label text for better readability
            link: isDark ? '#6B7280' : '#D1D5DB', // Very light, soft links (keeping as is)
            background: 'transparent',
            statusActive: '#10B981',
            statusPaused: '#F59E0B',
            statusInactive: isDark ? '#9CA3AF' : '#D1D5DB'
        };
    }, [resolvedTheme]);

    // Update dimensions on window resize - full canvas
    useEffect(() => {
        const updateDimensions = () => {
            const topBarHeight = 56; // Approximate top bar height
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight - topBarHeight
            });
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Initialize graph forces for fluid layout - expanded from start
    useEffect(() => {
        if (graphRef.current && filteredData.nodes.length > 0) {
            // Set forces immediately
            const charge = graphRef.current.d3Force('charge');
            const link = graphRef.current.d3Force('link');
            const center = graphRef.current.d3Force('center');
            
            if (charge) charge.strength(-400); // Very strong repulsion
            if (link) link.distance(120); // Large distance between nodes
            if (center) center.strength(0.01); // Very weak centering
            
            // Force restart simulation to apply immediately
            setTimeout(() => {
                if (graphRef.current) {
                    const charge = graphRef.current.d3Force('charge');
                    const link = graphRef.current.d3Force('link');
                    if (charge) charge.strength(-400);
                    if (link) link.distance(120);
                    // Reheat simulation to restart with new forces
                    (graphRef.current as any).d3ReheatSimulation?.();
                }
            }, 100);
        }
    }, [filteredData]);


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
            showProjects
        });

        const filteredNodes = graphData.nodes.filter(node => {
            // Type filter
            if (node.type === 'profile' && !showPeople) return false;
            if (node.type === 'post' && !showPosts) return false;
            if (node.type === 'project' && !showProjects) return false;
            
            
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
    }, [graphData, showPeople, showPosts, showProjects, connectionThreshold, nodeConnectionCounts]);

    // Calculate graph statistics and node importance
    const [nodeImportance, setNodeImportance] = useState<{ [id: string]: number }>({});
    
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

        // Calculate importance scores (0-1) based on connections
        const maxConn = Math.max(...Object.values(nodeConnectionCounts), 1);
        const importance: { [id: string]: number } = {};
        filteredData.nodes.forEach(node => {
            const connections = nodeConnectionCounts[node.id] || 0;
            importance[node.id] = maxConn > 0 ? connections / maxConn : 0;
        });
        setNodeImportance(importance);

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
                supabase.from('projects').select('id, title, description, status, icon'),
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

            // Create nodes - filter out profiles without names
            const profileNodes: ProfileNode[] = (profiles || [])
                .filter((p: any) => p.name && p.name.trim() !== '')
                .map((p: any) => ({
                    id: p.id,
                    label: p.name,
                    type: 'profile' as const,
                    group: 1,
                    value: 1,
                    title: p.title,
                    location: p.location,
                    avatar_url: p.avatar_url,
                    skills: profileSkills.get(p.id) || [],
                }));

            // Filter posts from unnamed users
            const postNodes: PostNode[] = (posts || [])
                .filter((p: any) => {
                    const authorName = profileMap.get(p.author_id);
                    return authorName && authorName.trim() !== '';
                })
                .map((p: any) => ({
                    id: `post-${p.id}`,
                    label: p.content || 'Post',
                    type: 'post' as const,
                    group: 2,
                    value: 1,
                    authorName: profileMap.get(p.author_id)!,
                    created_at: p.created_at
                }));

            const projectNodes: ProjectNode[] = (projects || []).map((p: any) => ({
                id: `project-${p.id}`,
                label: p.title || 'Untitled Project',
                type: 'project' as const,
                group: 3,
                value: 1,
                status: p.status,
                description: p.description,
                icon: p.icon
            }));

            // Create links - only for posts with named authors
            const authorLinks: Link[] = (posts || [])
                .filter((p: any) => {
                    const authorName = profileMap.get(p.author_id);
                    return authorName && authorName.trim() !== '';
                })
                .map((p: any) => ({
                    source: p.author_id,
                    target: `post-${p.id}`,
                    type: 'authored' as const
                }));

            // Filter mention links to only include named profiles
            const mentionLinks: Link[] = (postMentions || [])
                .filter((m: any) => {
                    const mentionedName = profileMap.get(m.profile_id);
                    return mentionedName && mentionedName.trim() !== '';
                })
                .map((m: any) => ({
                    source: `post-${m.post_id}`,
                    target: m.profile_id,
                    type: 'mentions_profile' as const
                }));

            const projectMentionLinks: Link[] = (postProjects || []).map((pp: any) => ({
                source: `post-${pp.post_id}`,
                target: `project-${pp.project_id}`,
                type: 'mentions_project' as const
            }));

            // Filter contribution links to only include named contributors
            const contributionLinks: Link[] = (contributions || [])
                .filter((c: any) => {
                    const contributorName = profileMap.get(c.person_id);
                    return contributorName && contributorName.trim() !== '';
                })
                .map((c: any) => ({
                    source: c.person_id,
                    target: `project-${c.project_id}`,
                    type: 'contributes' as const
                }));

            const allNodes = [...profileNodes, ...postNodes, ...projectNodes];
            const allLinks = [...authorLinks, ...mentionLinks, ...projectMentionLinks, ...contributionLinks];
            
            // Create a set of valid node IDs for link validation
            const validNodeIds = new Set(allNodes.map(node => node.id));
            
            // Filter links to only include those with valid source and target
            const validLinks = allLinks.filter(link => 
                validNodeIds.has(link.source) && validNodeIds.has(link.target)
            );
            
            // Calculate connection counts for each node
            const connectionCounts: { [id: string]: number } = {};
            allNodes.forEach(node => {
                connectionCounts[node.id] = 0;
            });
            
            validLinks.forEach(link => {
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
                links: validLinks,
            });
            setLoading(false);
        };
        fetchData();
    }, []);

    const handleNodeClick = useCallback((node: any) => {
        // Set the clicked node to show the popup
        setClickedNode(node.id);

        // Zoom in on the clicked node
        if (graphRef.current && node.x !== undefined && node.y !== undefined) {
            graphRef.current.centerAt(node.x, node.y, 1000);
            graphRef.current.zoom(2.5, 1000);
        }
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
            
            // Just center on the node without zooming
            if (graphRef.current && (profileMatch as any).x !== undefined) {
                graphRef.current.centerAt((profileMatch as any).x, (profileMatch as any).y, 1000);
                // Removed auto zoom - let users control their own zoom level
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
        <div className="relative w-full h-screen overflow-hidden bg-background">
            {/* Top Bar - View Switcher */}
            <div className="absolute top-0 left-0 right-0 z-30 bg-surface-container/80 backdrop-blur-md border-b border-border w-full">
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 w-full max-w-full">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* View Switcher */}
                        <div className="flex items-center gap-2 bg-surface-container-muted rounded-xl p-1">
                            <button
                                onClick={() => setViewMode('graph')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    viewMode === 'graph'
                                        ? 'bg-surface-container text-onsurface-primary shadow-sm'
                                        : 'text-onsurface-secondary hover:text-onsurface-primary'
                                }`}
                            >
                                Graph
                            </button>
                            <button
                                onClick={() => setViewMode('people')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    viewMode === 'people'
                                        ? 'bg-surface-container text-onsurface-primary shadow-sm'
                                        : 'text-onsurface-secondary hover:text-onsurface-primary'
                                }`}
                            >
                                People
                            </button>
                        </div>

                        {/* Graph-specific controls - only show in graph mode */}
                        {viewMode === 'graph' && (
                            <>
                                <div className="bg-surface-container-muted border border-border rounded-xl px-3 py-1.5 flex-shrink-0">
                                    <GraphModeSelector currentMode={currentMode} onModeChange={setCurrentMode} />
                                </div>

                        {/* Search */}
                                {currentMode === 'network' && (
                                    <div className="relative w-64 flex-shrink-0">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-onsurface-secondary w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        handleSearch(e.target.value);
                                    }}
                                            className="w-full pl-10 pr-4 py-2 bg-surface-container border border-border text-foreground text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-onsurface-secondary/60 transition-all"
                                />
                            </div>
                                )}
                    </>
                )}

                        {/* People view search */}
                        {viewMode === 'people' && (
                            <div className="relative flex-1 max-w-md min-w-0">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-onsurface-secondary w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search people, projects, posts..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-surface-container border border-border text-foreground text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-onsurface-secondary/60 transition-all"
                                />
                            </div>
                        )}
            </div>

                    {/* Right side controls - only for graph mode */}
                    {viewMode === 'graph' && currentMode === 'network' && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px-3 py-2 bg-surface-container border border-border rounded-xl hover:bg-surface-container-muted transition-all flex items-center gap-2 text-sm ${
                                    showFilters ? 'bg-surface-container-muted text-onsurface-primary' : 'text-onsurface-secondary'
                                }`}
                            >
                                <Filter className="w-4 h-4" />
                    </button>

                            <div className="bg-surface-container-muted border border-border rounded-xl p-1 flex gap-1">
                    <button
                        onClick={handleZoomIn}
                                    className="p-1.5 text-onsurface-secondary rounded-lg hover:bg-surface-container hover:text-onsurface-primary transition-all"
                        title="Zoom In"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleZoomOut}
                                    className="p-1.5 text-onsurface-secondary rounded-lg hover:bg-surface-container hover:text-onsurface-primary transition-all"
                        title="Zoom Out"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleZoomReset}
                                    className="p-1.5 text-onsurface-secondary rounded-lg hover:bg-surface-container hover:text-onsurface-primary transition-all"
                        title="Fit to Screen"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Legacy Search Bar - Hidden but kept for compatibility */}
            <div className="hidden" ref={searchInputRef}></div>

            {/* Main Canvas Area - Full screen */}
            <div className="absolute top-14 left-0 right-0 bottom-0">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="text-center">
                            <div className="text-5xl mb-3">🔗</div>
                            <p className="text-sm text-onsurface-secondary font-medium">Loading...</p>
                        </div>
                    </div>
                ) : viewMode === 'people' ? (
                    /* People View - Flex Wrap Grid */
                    <div className="h-full overflow-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex flex-wrap gap-4">
                            {filteredData.nodes
                                .filter(node => {
                                    // Filter by search query
                                    if (searchQuery.trim()) {
                                        const query = searchQuery.toLowerCase();
                                        return node.label.toLowerCase().includes(query) ||
                                            (node.type === 'profile' && (node as ProfileNode).title?.toLowerCase().includes(query)) ||
                                            (node.type === 'project' && (node as ProjectNode).description?.toLowerCase().includes(query));
                                    }
                                    return true;
                                })
                                .map((node) => {
                                    if (node.type === 'profile') {
                                        const profile = node as ProfileNode;
                                        return (
                                            <div key={node.id} className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]">
                                                <div
                                                    className="bg-surface-container rounded-xl border border-border hover:scale-[1.02] transition-all cursor-pointer h-full"
                                                    onClick={() => router.push(`/profile/${profile.id}`)}
                                                >
                                                    <div className="p-4 flex flex-col gap-3">
                                                        <div className="flex items-center gap-3">
                                                            {profile.avatar_url ? (
                                                                <Image
                                                                    src={profile.avatar_url}
                                                                    alt={profile.label}
                                                                    width={44}
                                                                    height={44}
                                                                    className="rounded-full"
                                                                />
                                                            ) : (
                                                                <div className="w-11 h-11 bg-avatar-bg rounded-full flex items-center justify-center text-onsurface-secondary font-medium">
                                                                    {profile.label.charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="font-medium text-onsurface-primary truncate">{profile.label}</h3>
                                                                {profile.title && (
                                                                    <p className="text-sm text-onsurface-secondary truncate">{profile.title}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {profile.location && (
                                                            <p className="text-xs text-onsurface-secondary">📍 {profile.location}</p>
                                                        )}
                                                        {profile.skills && profile.skills.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {profile.skills.slice(0, 4).map((skill, i) => (
                                                                    <span key={i} className="px-2 py-0.5 bg-surface-container-muted text-onsurface-primary text-xs rounded-lg">
                                                                        {skill}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    } else if (node.type === 'project') {
                                        const project = node as ProjectNode;
                                        const projectId = node.id.replace('project-', '');
                                        return (
                                            <div key={node.id} className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]">
                                                <div
                                                    className="bg-surface-container rounded-xl border border-border hover:scale-[1.02] transition-all cursor-pointer h-full"
                                                    onClick={() => router.push(`/projects/${projectId}`)}
                                                >
                                                    <div className="p-4 flex flex-col gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-11 h-11 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium">
                                                                {project.label.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="font-medium text-onsurface-primary truncate">{project.label}</h3>
                                                                {project.status && (
                                                                    <p className="text-xs text-onsurface-secondary capitalize">{project.status}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {project.description && (
                                                            <p className="text-sm text-onsurface-primary line-clamp-2">{project.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })}
                        </div>
                        {filteredData.nodes.length === 0 && (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-onsurface-secondary">No results found</p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Graph View - Full Canvas */
                    <>
                        {/* Floating Graph Controls */}
                        {showFilters && currentMode === 'network' && (
                            <div className="absolute top-4 left-4 z-20">
                            <EnhancedGraphControls
                                showPeople={showPeople}
                                showProjects={showProjects}
                                showPosts={showPosts}
                                onTogglePeople={() => setShowPeople(!showPeople)}
                                onToggleProjects={() => setShowProjects(!showProjects)}
                                onTogglePosts={() => setShowPosts(!showPosts)}
                                connectionThreshold={connectionThreshold}
                                onConnectionThresholdChange={setConnectionThreshold}
                            />
                            </div>
                        )}

                        {/* Graph Canvas Container - Full Screen */}
                        <div className="relative w-full h-full overflow-hidden">
                        {/* Node Details Panel - Show on hover or click */}
                        {(hoveredNode || clickedNode) && (() => {
                            const nodeId = clickedNode || hoveredNode;
                            const nodeData = filteredData.nodes.find(n => n.id === nodeId);
                            if (!nodeData) return null;

                            return (
                                        <div className={`absolute top-4 right-4 z-20 bg-surface-container border border-border rounded-xl shadow-lg p-5 w-72 ${clickedNode ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                                    {/* Close button for clicked nodes */}
                                    {clickedNode && (
                                        <button
                                            onClick={() => setClickedNode(null)}
                                            className="absolute top-3 right-3 p-1 text-onsurface-secondary hover:text-onsurface-primary transition-colors rounded-lg hover:bg-surface-container-muted"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}

                                    <div className="flex items-start gap-3 mb-4">
                                        {nodeData.type === 'profile' && (nodeData as ProfileNode).avatar_url ? (
                                            <Image
                                                src={(nodeData as ProfileNode).avatar_url!}
                                                alt={nodeData.label}
                                                width={48}
                                                height={48}
                                                className="rounded-full ring-2 ring-border/30"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-surface-container-muted flex items-center justify-center text-2xl">
                                                {nodeData.type === 'profile' ? '👤' :
                                                 nodeData.type === 'project' ? '🚀' :
                                                 '💬'}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-foreground text-base mb-0.5 truncate">
                                                {nodeData.label.length > 24 ? nodeData.label.slice(0, 24) + '...' : nodeData.label}
                                            </h3>
                                            <p className="text-xs text-onsurface-secondary capitalize">
                                                {nodeData.type}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 text-sm">
                                        {nodeData.type === 'profile' && (
                                            <>
                                                {(nodeData as ProfileNode).title && (
                                                    <div className="text-onsurface-primary text-sm">
                                                        {(nodeData as ProfileNode).title}
                                                    </div>
                                                )}
                                                {(nodeData as ProfileNode).location && (
                                                    <div className="flex items-center gap-1.5 text-onsurface-secondary text-sm">
                                                        <span>📍</span>
                                                        <span>{(nodeData as ProfileNode).location}</span>
                                                    </div>
                                                )}
                                                {(nodeData as ProfileNode).skills && (nodeData as ProfileNode).skills!.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(nodeData as ProfileNode).skills!.slice(0, 5).map((skill, i) => (
                                                            <span key={i} className="px-2.5 py-1 bg-surface-container-muted text-onsurface-primary text-xs rounded-lg font-medium">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                        {(nodeData as ProfileNode).skills!.length > 5 && (
                                                            <span className="px-2.5 py-1 text-xs text-onsurface-secondary">
                                                                +{(nodeData as ProfileNode).skills!.length - 5} more
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
                                                        <div className={`w-2 h-2 rounded-full`} style={{
                                                            backgroundColor: (nodeData as ProjectNode).status === 'active' ? canvasColors.statusActive :
                                                                           (nodeData as ProjectNode).status === 'paused' ? canvasColors.statusPaused :
                                                                           canvasColors.statusInactive
                                                        }} />
                                                        <span className="text-onsurface-primary capitalize text-sm font-medium">
                                                            {(nodeData as ProjectNode).status}
                                                        </span>
                                                    </div>
                                                )}
                                                {(nodeData as ProjectNode).description && (
                                                    <p className="text-onsurface-secondary text-sm line-clamp-3 leading-relaxed">
                                                        {(nodeData as ProjectNode).description}
                                                    </p>
                                                )}
                                            </>
                                        )}

                                        {nodeData.type === 'post' && (
                                            <>
                                                <div className="text-onsurface-primary text-sm">
                                                    by {(nodeData as PostNode).authorName}
                                                </div>
                                                {(nodeData as PostNode).created_at && (
                                                    <div className="text-onsurface-secondary text-xs">
                                                        {new Date((nodeData as PostNode).created_at!).toLocaleDateString()}
                                                    </div>
                                                )}
                                                <p className="text-onsurface-secondary text-sm line-clamp-3 leading-relaxed">
                                                    {nodeData.label}
                                                </p>
                                            </>
                                        )}

                                        <div className="pt-3 mt-3 border-t border-border/30 flex items-center justify-between">
                                            <span className="text-sm text-onsurface-secondary">Connections</span>
                                            <span className="text-sm font-semibold text-foreground">
                                                {nodeConnectionCounts[nodeData.id] || 0}
                                            </span>
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
                                                className="w-full mt-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary-hover transition-all rounded-xl font-medium text-sm flex items-center justify-center gap-2"
                                            >
                                                View Full Page
                                                <ChevronRight size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Graph Canvas - Mode-specific rendering */}
                            {currentMode === 'skill-radar' ? (
                                <SkillRadarVisualization
                                    graphData={graphData}
                                    dimensions={dimensions}
                                    onNodeClick={handleNodeClick}
                                    onNodeHover={(node: any) => setHoveredNode(node?.id || null)}
                                />
                            ) : (
                                    <ForceGraph2D
                                ref={graphRef}
                                graphData={filteredData}
                                width={dimensions.width}
                                height={dimensions.height}
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
                                cooldownTicks={300}
                                minZoom={0.1}
                                maxZoom={4}
                                enableZoomInteraction={true}
                                enableNodeDrag={true}
                                d3AlphaDecay={0.008}
                                d3VelocityDecay={0.25}
                                dagMode={undefined}
                                dagLevelDistance={undefined}
                                onEngineStart={() => {
                                    // Set expanded forces immediately when engine starts
                                    if (graphRef.current) {
                                        const charge = graphRef.current.d3Force('charge');
                                        const link = graphRef.current.d3Force('link');
                                        const center = graphRef.current.d3Force('center');
                                        if (charge) charge.strength(-400);
                                        if (link) link.distance(120);
                                        if (center) center.strength(0.01);
                                    }
                                }}
                                onEngineStop={() => {
                                    // Keep expanded layout - maintain spacing
                                    if (graphRef.current) {
                                        const charge = graphRef.current.d3Force('charge');
                                        const link = graphRef.current.d3Force('link');
                                        const center = graphRef.current.d3Force('center');
                                        if (charge) charge.strength(-350); // Keep very strong repulsion
                                        if (link) link.distance(110); // Maintain large distance
                                        if (center) center.strength(0.01); // Very weak centering
                                    }
                                }}
                                nodeCanvasObjectMode={() => 'replace'}
                                nodeCanvasObject={(node, ctx, globalScale) => {
                                    const isRelated = !hoveredNode || relatedNodes.has(node.id as string);
                                    const isHovered = node.id === hoveredNode;
                                    
                                    // Draw non-hovered nodes first (lower z-index)
                                    if (hoveredNode && !isHovered && !isRelated) {
                                        // These will be drawn with lower opacity
                                    }
                                    
                                    // Node styling based on type - clean and minimal
                                    let color = canvasColors.nodeDefault;
                                    let baseSize = 5; // Base size

                                    if (node.type === 'profile') {
                                        color = canvasColors.nodeProfile;
                                        baseSize = 7; // Larger profiles
                                    } else if (node.type === 'project') {
                                        color = canvasColors.nodeProject;
                                        baseSize = 6;
                                    } else if (node.type === 'post') {
                                        color = canvasColors.nodePost;
                                        baseSize = 4;
                                    }

                                    // Calculate importance and size - subtle, fluid scaling
                                    const connections = nodeConnectionCounts[node.id as string] || 0;
                                    const importance = nodeImportance[node.id] || 0;
                                    // Subtle size scaling: important nodes get slightly larger
                                    const sizeMultiplier = 1 + (importance * 0.8); // 1x to 1.8x base size - more subtle
                                    const size = baseSize * sizeMultiplier;
                                    
                                    // Use base color - keep it clean and minimal
                                    const nodeColor = color;
                                    
                                    // Bright, readable opacity
                                    if (!hoveredNode) {
                                        ctx.globalAlpha = 0.9 + (importance * 0.1); // More opaque for better visibility
                                    } else {
                                        ctx.globalAlpha = isRelated ? 1 : 0.15; // More visible fade for non-related
                                    }
                                    
                                    // Skip rendering if node position is not initialized
                                    if (!isFinite(node.x!) || !isFinite(node.y!)) return;
                                    
                                    // Fluid, minimal outlined nodes - soft lines
                                    const lineWidth = isHovered ? 1.5 : (0.8 + importance * 0.4); // Thinner, softer lines
                                    
                                    if (node.type === 'profile' && (node as ProfileNode).avatar_url) {
                                        // Profile with avatar - show image with outline
                                        ctx.save();
                                        ctx.beginPath();
                                        ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
                                        ctx.clip();

                                        const avatarUrl = (node as ProfileNode).avatar_url!;
                                        let img = (node as any).__img;

                                        if (!img) {
                                            img = new (window as any).Image();
                                            img.crossOrigin = 'anonymous';
                                            img.src = avatarUrl;
                                            (node as any).__img = img;

                                            // Placeholder - outlined circle
                                            ctx.fillStyle = canvasColors.placeholder;
                                            ctx.fillRect(node.x! - size, node.y! - size, size * 2, size * 2);
                                        } else if (img.complete && img.naturalWidth > 0) {
                                            ctx.drawImage(img, node.x! - size, node.y! - size, size * 2, size * 2);
                                        } else {
                                            ctx.fillStyle = canvasColors.placeholder;
                                            ctx.fillRect(node.x! - size, node.y! - size, size * 2, size * 2);
                                        }

                                        ctx.restore();

                                        // Draw outline around avatar - brighter for important nodes
                                        ctx.beginPath();
                                        ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
                                        ctx.strokeStyle = nodeColor;
                                        ctx.lineWidth = lineWidth;
                                        ctx.stroke();
                                    } else if (node.type === 'profile') {
                                        // Profile without image - outlined circle
                                        ctx.beginPath();
                                        ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
                                        ctx.strokeStyle = nodeColor;
                                        ctx.lineWidth = lineWidth;
                                        ctx.stroke();

                                        // Small filled center dot - minimal variation
                                        const dotSize = size * 0.3;
                                        ctx.beginPath();
                                        ctx.arc(node.x!, node.y!, dotSize, 0, 2 * Math.PI);
                                        ctx.fillStyle = nodeColor;
                                        ctx.fill();
                                    } else if (node.type === 'project') {
                                        // Project nodes - outlined circle
                                        ctx.beginPath();
                                        ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
                                        ctx.strokeStyle = nodeColor;
                                        ctx.lineWidth = lineWidth;
                                        ctx.stroke();

                                        // Small filled center dot
                                        const dotSize = size * 0.3;
                                        ctx.beginPath();
                                        ctx.arc(node.x!, node.y!, dotSize, 0, 2 * Math.PI);
                                        ctx.fillStyle = nodeColor;
                                        ctx.fill();
                                    } else {
                                        // Post nodes - simple filled circles with size variation
                                        ctx.beginPath();
                                        ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
                                        ctx.fillStyle = nodeColor;
                                        ctx.fill();
                                    }
                                    
                                    // Draw labels - fluid, appear smoothly on zoom or hover
                                    const shouldShowLabel = (node.type === 'profile' || node.type === 'project') &&
                                        isFinite(node.x!) && isFinite(node.y!) && 
                                        (globalScale > 1.05 || isHovered || importance > 0.6);
                                    
                                    if (shouldShowLabel) {
                                        const label = node.label && node.label.length > 30 ? node.label.slice(0, 30) + '...' : node.label;
                                        
                                        // Fluid label opacity - smooth fade in/out
                                        let labelOpacity = 1;
                                        if (importance <= 0.6 && !isHovered) {
                                            // Smooth interpolation for zoom-based visibility
                                            labelOpacity = Math.max(0, Math.min((globalScale - 1.05) * 3, 1));
                                        }
                                        
                                        if (!hoveredNode && importance <= 0.6) {
                                            ctx.globalAlpha = labelOpacity * 0.85; // Slightly more transparent
                                        } else {
                                            ctx.globalAlpha = isRelated ? labelOpacity : labelOpacity * 0.08; // Softer fade
                                        }
                                        
                                        // Light, fluid typography
                                        const fontSize = 8.5;
                                        ctx.font = `400 ${fontSize}px DM Sans, sans-serif`; // Lighter weight
                                        
                                        // Soft, minimal text
                                        ctx.textAlign = 'center';
                                        ctx.textBaseline = 'top';
                                        ctx.fillStyle = canvasColors.label;
                                        ctx.fillText(label as string, node.x!, node.y! + size + 4);
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

                                    // Clean, minimal links - subtle variation
                                    const sourceImportance = nodeImportance[source.id] || 0;
                                    const targetImportance = nodeImportance[target.id] || 0;
                                    const linkImportance = Math.max(sourceImportance, targetImportance);
                                    
                                    // Fluid, soft links - very light and smooth
                                    ctx.strokeStyle = canvasColors.link;
                                    ctx.lineWidth = (isRelated && hoveredNode) ? 1.2 : (0.5 + linkImportance * 0.3); // Thinner, softer
                                    
                                    if (!hoveredNode) {
                                        ctx.globalAlpha = 0.08 + (linkImportance * 0.06); // Very subtle, light
                                    } else {
                                        ctx.globalAlpha = isRelated ? 0.4 : 0.02; // Softer, more fluid fade
                                    }
                                    
                                    // Calculate arrow direction
                                    const dx = target.x - source.x;
                                    const dy = target.y - source.y;
                                    const distance = Math.sqrt(dx * dx + dy * dy);
                                    const unitX = dx / distance;
                                    const unitY = dy / distance;
                                    
                                    // Adjust for node radius - match updated sizes
                                    const getNodeSize = (nodeId: string, nodeType: string) => {
                                        let baseSize = 5;
                                        if (nodeType === 'profile') baseSize = 7;
                                        else if (nodeType === 'project') baseSize = 6;
                                        else if (nodeType === 'post') baseSize = 4;
                                        const connections = nodeConnectionCounts[nodeId] || 0;
                                        return baseSize + Math.sqrt(connections) * 1;
                                    };
                                    const sourceRadius = getNodeSize(source.id, source.type);
                                    const targetRadius = getNodeSize(target.id, target.type);
                                    
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

                                    // Match updated node sizes for better clickability
                                    let baseSize = 5;

                                    if (node.type === 'profile') {
                                        baseSize = 7;
                                    } else if (node.type === 'project') {
                                        baseSize = 6;
                                    } else if (node.type === 'post') {
                                        baseSize = 4;
                                    }

                                    const connections = nodeConnectionCounts[node.id as string] || 0;
                                    const size = baseSize + Math.sqrt(connections) * 1;

                                    ctx.fillStyle = color;
                                    ctx.beginPath();
                                    ctx.arc(node.x!, node.y!, size + 3, 0, 2 * Math.PI); // Generous padding for easier clicking
                                    ctx.fill();
                                }}
                                        warmupTicks={200}
                            />
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}