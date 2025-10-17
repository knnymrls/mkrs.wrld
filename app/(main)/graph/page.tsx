'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { ZoomIn, ZoomOut, Maximize2, Filter, Users, Briefcase, MessageCircle, X, ChevronRight, Search, Sun, Moon, Monitor } from 'lucide-react';
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
    const { theme, setTheme, resolvedTheme } = useTheme();
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

    // Theme-aware colors for canvas rendering - Obsidian style
    const canvasColors = useMemo(() => {
        const isDark = resolvedTheme === 'dark';
        return {
            nodeDefault: isDark ? '#9CA3AF' : '#6B7280',
            nodeProfile: isDark ? '#8B5CF6' : '#7C3AED', // Purple for profiles
            nodeProject: isDark ? '#F59E0B' : '#D97706', // Amber for projects
            nodePost: isDark ? '#10B981' : '#059669', // Green for posts
            placeholder: isDark ? '#6B7280' : '#9CA3AF',
            label: isDark ? '#D1D5DB' : '#4B5563', // Lighter labels for better visibility
            link: isDark ? '#4B5563' : '#9CA3AF', // Subtle gray links
            background: 'transparent',
            statusActive: '#10B981',
            statusPaused: '#F59E0B',
            statusInactive: isDark ? '#6B7280' : '#9CA3AF'
        };
    }, [resolvedTheme]);

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
        <div className="relative w-full h-screen bg-background overflow-hidden">
            {/* Unified Control Panel - Top Left */}
            <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
                <GraphModeSelector currentMode={currentMode} onModeChange={setCurrentMode} />

                {currentMode === 'network' && (
                    <>
                        {/* Search */}
                        <div className="bg-surface-container/95 backdrop-blur-xl rounded-xl p-2 border border-border/30 shadow-sm">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-onsurface-secondary w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        handleSearch(e.target.value);
                                    }}
                                    className="w-56 pl-9 pr-3 py-2 bg-transparent text-foreground text-sm rounded-lg focus:outline-none placeholder:text-onsurface-secondary/60"
                                />
                            </div>
                        </div>

                        {/* Filter Button */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`bg-surface-container/95 backdrop-blur-xl text-foreground px-3 py-2 rounded-xl hover:bg-surface-container transition-all flex items-center gap-2 border border-border/30 shadow-sm ${showFilters ? 'bg-surface-container' : ''}`}
                        >
                            <Filter className="w-4 h-4" />
                            <span className="text-sm font-medium">Filters</span>
                        </button>
                    </>
                )}
            </div>

            {/* Unified Controls - Top Right */}
            <div className="absolute top-6 right-6 z-10 flex gap-2">
                {/* Theme Toggle */}
                <div className="bg-surface-container/95 backdrop-blur-xl rounded-xl p-1.5 border border-border/30 shadow-sm flex gap-1">
                    <button
                        onClick={() => setTheme('light')}
                        className={`p-2 rounded-lg transition-all ${
                            theme === 'light' ? 'bg-primary text-white dark:text-background shadow-sm' : 'hover:bg-surface-container-muted text-onsurface-secondary'
                        }`}
                        title="Light Mode"
                    >
                        <Sun className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setTheme('dark')}
                        className={`p-2 rounded-lg transition-all ${
                            theme === 'dark' ? 'bg-primary text-white dark:text-background shadow-sm' : 'hover:bg-surface-container-muted text-onsurface-secondary'
                        }`}
                        title="Dark Mode"
                    >
                        <Moon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setTheme('system')}
                        className={`p-2 rounded-lg transition-all ${
                            theme === 'system' ? 'bg-primary text-white dark:text-background shadow-sm' : 'hover:bg-surface-container-muted text-onsurface-secondary'
                        }`}
                        title="System Theme"
                    >
                        <Monitor className="w-4 h-4" />
                    </button>
                </div>

                {/* Zoom Controls */}
                <div className="bg-surface-container/95 backdrop-blur-xl rounded-xl p-1.5 border border-border/30 shadow-sm flex gap-1">
                    <button
                        onClick={handleZoomIn}
                        className="p-2 text-onsurface-secondary rounded-lg hover:bg-surface-container-muted hover:text-foreground transition-all"
                        title="Zoom In"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleZoomOut}
                        className="p-2 text-onsurface-secondary rounded-lg hover:bg-surface-container-muted hover:text-foreground transition-all"
                        title="Zoom Out"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleZoomReset}
                        className="p-2 text-onsurface-secondary rounded-lg hover:bg-surface-container-muted hover:text-foreground transition-all"
                        title="Fit to Screen"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Legacy Search Bar - Hidden but kept for compatibility */}
            <div className="hidden" ref={searchInputRef}></div>

            {/* Main Content */}
            <div className="relative w-full h-full">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="text-center">
                            <div className="text-5xl mb-3">🔗</div>
                            <p className="text-sm text-onsurface-secondary font-medium">Loading knowledge graph...</p>
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
                            />
                        )}

                        {/* Node Details Panel - Show on hover or click */}
                        {(hoveredNode || clickedNode) && (() => {
                            const nodeId = clickedNode || hoveredNode;
                            const nodeData = filteredData.nodes.find(n => n.id === nodeId);
                            if (!nodeData) return null;

                            return (
                                <div className={`absolute top-24 right-6 z-20 bg-surface-container/95 backdrop-blur-xl rounded-2xl border border-border/30 shadow-lg p-5 w-72 ${clickedNode ? 'pointer-events-auto' : 'pointer-events-none'}`}>
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
                                                className="w-full mt-2 px-4 py-2.5 bg-primary text-white dark:text-background hover:bg-primary-hover transition-all rounded-xl font-medium text-sm flex items-center justify-center gap-2"
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
                                cooldownTicks={100}
                                minZoom={0.1}
                                maxZoom={4}
                                enableZoomInteraction={true}
                                enableNodeDrag={true}
                                d3AlphaDecay={0.02}
                                d3VelocityDecay={0.4}
                                dagMode={undefined}
                                dagLevelDistance={undefined}
                                onEngineStop={() => {
                                    // Obsidian-style: More breathing room
                                    if (graphRef.current) {
                                        graphRef.current.d3Force('charge').strength(-200); // More repulsion for cleaner layout
                                        graphRef.current.d3Force('link').distance(60); // More space between nodes
                                        graphRef.current.d3Force('center').strength(0.05);
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
                                    
                                    // Node styling based on type - cleaner, larger nodes
                                    let color = canvasColors.nodeDefault;
                                    let baseSize = 5; // Increased base size

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

                                    // Size based on connections - smoother scaling
                                    const connections = nodeConnectionCounts[node.id as string] || 0;
                                    const size = baseSize + Math.sqrt(connections) * 1;
                                    
                                    // Obsidian-style opacity: More subtle fade
                                    if (!hoveredNode) {
                                        ctx.globalAlpha = 0.9; // Slightly transparent in normal state
                                    } else {
                                        ctx.globalAlpha = isRelated ? 1 : 0.15; // Gentle fade for non-related
                                    }
                                    
                                    // Skip rendering if node position is not initialized
                                    if (!isFinite(node.x!) || !isFinite(node.y!)) return;
                                    
                                    // Obsidian-style: Outlined nodes
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

                                        // Draw outline around avatar
                                        ctx.beginPath();
                                        ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
                                        ctx.strokeStyle = isHovered ? canvasColors.nodeProfile : canvasColors.nodeProfile;
                                        ctx.lineWidth = isHovered ? 2.5 : 2;
                                        ctx.stroke();
                                    } else if (node.type === 'profile') {
                                        // Profile without image - outlined circle
                                        ctx.beginPath();
                                        ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
                                        ctx.strokeStyle = canvasColors.nodeProfile;
                                        ctx.lineWidth = isHovered ? 2.5 : 2;
                                        ctx.stroke();

                                        // Small filled center dot
                                        ctx.beginPath();
                                        ctx.arc(node.x!, node.y!, size * 0.3, 0, 2 * Math.PI);
                                        ctx.fillStyle = canvasColors.nodeProfile;
                                        ctx.fill();
                                    } else if (node.type === 'project') {
                                        // Project nodes - outlined circle
                                        ctx.beginPath();
                                        ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
                                        ctx.strokeStyle = canvasColors.nodeProject;
                                        ctx.lineWidth = isHovered ? 2.5 : 2;
                                        ctx.stroke();

                                        // Small filled center dot
                                        ctx.beginPath();
                                        ctx.arc(node.x!, node.y!, size * 0.3, 0, 2 * Math.PI);
                                        ctx.fillStyle = canvasColors.nodeProject;
                                        ctx.fill();
                                    } else {
                                        // Post nodes - smaller outlined circles
                                        ctx.beginPath();
                                        ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
                                        ctx.strokeStyle = canvasColors.nodePost;
                                        ctx.lineWidth = isHovered ? 2 : 1.5;
                                        ctx.stroke();

                                        // Tiny filled center
                                        ctx.beginPath();
                                        ctx.arc(node.x!, node.y!, size * 0.25, 0, 2 * Math.PI);
                                        ctx.fillStyle = canvasColors.nodePost;
                                        ctx.fill();
                                    }
                                    
                                    // Draw labels when zoomed in - fixed visibility
                                    if ((node.type === 'profile' || node.type === 'project') &&
                                        isFinite(node.x!) && isFinite(node.y!) && globalScale > 1.2) {
                                        // Show labels when zoomed IN (globalScale > threshold)
                                        const labelOpacity = Math.min((globalScale - 1.2) * 1.5, 1);
                                        if (!hoveredNode) {
                                            ctx.globalAlpha = labelOpacity;
                                        } else {
                                            ctx.globalAlpha = isRelated ? labelOpacity : labelOpacity * 0.15;
                                        }
                                        const label = node.label && node.label.length > 20 ? node.label.slice(0, 20) + '...' : node.label;

                                        // Obsidian-style typography - smaller text
                                        const fontSize = 10;
                                        ctx.font = `500 ${fontSize}px Satoshi, sans-serif`;

                                        // Text with better contrast
                                        ctx.fillStyle = canvasColors.label;
                                        ctx.textAlign = 'center';
                                        ctx.textBaseline = 'top';
                                        ctx.fillText(label as string, node.x!, node.y! + size + 6);
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

                                    // Obsidian-style: Very subtle links
                                    ctx.strokeStyle = canvasColors.link;
                                    ctx.lineWidth = isRelated && hoveredNode ? 1.5 : 1;
                                    if (!hoveredNode) {
                                        ctx.globalAlpha = 0.2; // Very subtle in normal state
                                    } else {
                                        ctx.globalAlpha = isRelated ? 0.6 : 0.05; // Highlight connections on hover
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
                                warmupTicks={100}
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