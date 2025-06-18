'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Search, ZoomIn, ZoomOut, Maximize2, Filter, Users, Briefcase, MessageCircle, X, ChevronRight, Activity, TrendingUp, Network } from 'lucide-react';
import Image from 'next/image';

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
    const [searchResults, setSearchResults] = useState<GraphNode[]>([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);
    const [nodeConnectionCounts, setNodeConnectionCounts] = useState<{ [id: string]: number }>({});
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const graphRef = useRef<any>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        showProfiles: true,
        showPosts: true,
        showProjects: true,
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
            graphRef.current.zoomToFit(400, 50);
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
        const results = filteredData.nodes.filter(node => {
            if (node.type === 'profile') {
                return node.label.toLowerCase().includes(lowerQuery) ||
                       (node.title && node.title.toLowerCase().includes(lowerQuery)) ||
                       (node.location && node.location.toLowerCase().includes(lowerQuery)) ||
                       ((node as ProfileNode).skills?.some(skill => skill.toLowerCase().includes(lowerQuery)));
            } else if (node.type === 'project') {
                return node.label.toLowerCase().includes(lowerQuery) ||
                       ((node as ProjectNode).description && (node as ProjectNode).description!.toLowerCase().includes(lowerQuery));
            } else if (node.type === 'post') {
                return node.label.toLowerCase().includes(lowerQuery) ||
                       ((node as PostNode).authorName && (node as PostNode).authorName!.toLowerCase().includes(lowerQuery));
            }
            return false;
        });
        
        setSearchResults(results.slice(0, 10));
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
        setSearchQuery('');
        setShowSearchDropdown(false);
        
        // Navigate directly for profiles and projects
        if (node.type === 'profile') {
            router.push(`/profile/${node.id}`);
        } else if (node.type === 'project') {
            const projectId = node.id.replace('project-', '');
            router.push(`/projects/${projectId}`);
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
        <div className="relative w-full h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Knowledge Graph</h1>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Network size={16} />
                            <span>{graphStats.totalNodes} nodes</span>
                            <span className="text-gray-400">•</span>
                            <span>{graphStats.totalEdges} connections</span>
                        </div>
                    </div>
                    
                    {/* Search Bar */}
                    <div className="relative flex-1 max-w-md mx-6" ref={searchInputRef}>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            onFocus={() => searchQuery && setShowSearchDropdown(searchResults.length > 0)}
                            placeholder="Search people, projects, or posts..."
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        />
                        
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
                                            node.type === 'profile' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' :
                                            node.type === 'project' ? 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400' :
                                            'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400'
                                        }`}>
                                            {node.type === 'profile' ? <Users size={16} /> :
                                             node.type === 'project' ? <Briefcase size={16} /> : 
                                             <MessageCircle size={16} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 dark:text-white truncate">
                                                {node.label.length > 50 ? node.label.slice(0, 50) + '...' : node.label}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {node.type === 'profile' && (node as ProfileNode).title ? (node as ProfileNode).title :
                                                 node.type === 'project' ? `${(node as ProjectNode).status || 'Active'} Project` :
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

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2 rounded-lg transition-colors ${
                                showFilters 
                                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                            }`}
                        >
                            <Filter size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="relative w-full h-full pt-[73px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500 dark:text-gray-400">Loading knowledge graph...</p>
                    </div>
                ) : (
                    <>
                        {/* Filters Panel */}
                        {showFilters && (
                            <div className="absolute top-4 left-4 z-20 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-64">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Filters</h3>
                                    <button
                                        onClick={() => setShowFilters(false)}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                            Node Types
                                        </label>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={filters.showProfiles}
                                                    onChange={(e) => setFilters({ ...filters, showProfiles: e.target.checked })}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">People ({graphStats.profileCount})</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={filters.showProjects}
                                                    onChange={(e) => setFilters({ ...filters, showProjects: e.target.checked })}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">Projects ({graphStats.projectCount})</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={filters.showPosts}
                                                    onChange={(e) => setFilters({ ...filters, showPosts: e.target.checked })}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">Posts ({graphStats.postCount})</span>
                                            </label>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                            Minimum Connections: {filters.minConnections}
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="10"
                                            value={filters.minConnections}
                                            onChange={(e) => setFilters({ ...filters, minConnections: parseInt(e.target.value) })}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Graph Stats */}
                        <div className="absolute bottom-4 left-4 z-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg p-4 max-w-xs">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <Activity size={16} />
                                Graph Insights
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Avg. connections</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{graphStats.avgConnections}</span>
                                </div>
                                {graphStats.mostConnected && (
                                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                        <p className="text-gray-600 dark:text-gray-400 mb-1">Most connected:</p>
                                        <p className="font-medium text-gray-900 dark:text-white truncate">
                                            {graphStats.mostConnected.label}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {nodeConnectionCounts[graphStats.mostConnected.id]} connections
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Zoom Controls */}
                        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
                            <button
                                onClick={handleZoomIn}
                                className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                title="Zoom In"
                            >
                                <ZoomIn size={20} />
                            </button>
                            <button
                                onClick={handleZoomOut}
                                className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                title="Zoom Out"
                            >
                                <ZoomOut size={20} />
                            </button>
                            <button
                                onClick={handleZoomReset}
                                className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                title="Reset View"
                            >
                                <Maximize2 size={20} />
                            </button>
                        </div>

                        {/* Node Details Panel - Show on hover or click */}
                        {(hoveredNode || clickedNode) && (() => {
                            const nodeId = clickedNode || hoveredNode;
                            const nodeData = filteredData.nodes.find(n => n.id === nodeId);
                            if (!nodeData) return null;
                            
                            return (
                                <div className={`absolute top-20 right-4 z-20 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-80 max-h-[calc(100vh-200px)] overflow-y-auto ${clickedNode ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3 flex-1">
                                            {nodeData.type === 'profile' && (nodeData as ProfileNode).avatar_url ? (
                                                <Image
                                                    src={(nodeData as ProfileNode).avatar_url!}
                                                    alt={nodeData.label}
                                                    width={48}
                                                    height={48}
                                                    className="rounded-full"
                                                />
                                            ) : (
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                                    nodeData.type === 'profile' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' :
                                                    nodeData.type === 'project' ? 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400' :
                                                    'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400'
                                                }`}>
                                                    {nodeData.type === 'profile' ? <Users size={24} /> :
                                                     nodeData.type === 'project' ? <Briefcase size={24} /> : 
                                                     <MessageCircle size={24} />}
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                                    {nodeData.label.length > 30 ? nodeData.label.slice(0, 30) + '...' : nodeData.label}
                                                </h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
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
                                                className="ml-2 p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
                                                title="View full page"
                                            >
                                                <ChevronRight size={20} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        {nodeData.type === 'profile' && (
                                            <>
                                                {(nodeData as ProfileNode).title && (
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Title</p>
                                                        <p className="text-sm text-gray-900 dark:text-white">{(nodeData as ProfileNode).title}</p>
                                                    </div>
                                                )}
                                                {(nodeData as ProfileNode).location && (
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Location</p>
                                                        <p className="text-sm text-gray-900 dark:text-white">{(nodeData as ProfileNode).location}</p>
                                                    </div>
                                                )}
                                                {(nodeData as ProfileNode).skills && (nodeData as ProfileNode).skills!.length > 0 && (
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Skills</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {(nodeData as ProfileNode).skills!.slice(0, 5).map((skill, i) => (
                                                                <span key={i} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                                                                    {skill}
                                                                </span>
                                                            ))}
                                                            {(nodeData as ProfileNode).skills!.length > 5 && (
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                    +{(nodeData as ProfileNode).skills!.length - 5} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {nodeData.type === 'project' && (
                                            <>
                                                {(nodeData as ProjectNode).status && (
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</p>
                                                        <p className="text-sm text-gray-900 dark:text-white capitalize">{(nodeData as ProjectNode).status}</p>
                                                    </div>
                                                )}
                                                {(nodeData as ProjectNode).description && (
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</p>
                                                        <p className="text-sm text-gray-900 dark:text-white">{(nodeData as ProjectNode).description}</p>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {nodeData.type === 'post' && (
                                            <>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Author</p>
                                                    <p className="text-sm text-gray-900 dark:text-white">{(nodeData as PostNode).authorName}</p>
                                                </div>
                                                {(nodeData as PostNode).created_at && (
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Posted</p>
                                                        <p className="text-sm text-gray-900 dark:text-white">
                                                            {new Date((nodeData as PostNode).created_at!).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Content</p>
                                                    <p className="text-sm text-gray-900 dark:text-white">
                                                        {nodeData.label.length > 200 ? nodeData.label.slice(0, 200) + '...' : nodeData.label}
                                                    </p>
                                                </div>
                                            </>
                                        )}

                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Connections</p>
                                            <p className="text-sm text-gray-900 dark:text-white">{nodeConnectionCounts[nodeData.id] || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Graph Canvas */}
                        <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
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
                                cooldownTicks={100}
                                enableZoomInteraction={true}
                                enableNodeDrag={true}
                                nodeCanvasObjectMode={() => 'after'}
                                nodeCanvasObject={(node, ctx, globalScale) => {
                                    const isRelated = !hoveredNode || relatedNodes.has(node.id as string);
                                    const isHovered = node.id === hoveredNode;
                                    
                                    // Node styling based on type
                                    let color = '#3B82F6'; // blue
                                    let baseSize = 5;
                                    
                                    if (node.type === 'profile') {
                                        color = '#3B82F6'; // blue
                                        baseSize = 8;
                                    } else if (node.type === 'project') {
                                        color = '#F59E0B'; // amber
                                        baseSize = 8;
                                    } else if (node.type === 'post') {
                                        color = '#10B981'; // emerald
                                        baseSize = 4;
                                    }
                                    
                                    // Size based on connections
                                    const connections = nodeConnectionCounts[node.id as string] || 0;
                                    const size = baseSize + Math.sqrt(connections) * 2;
                                    
                                    // Opacity for non-related nodes
                                    ctx.globalAlpha = isRelated ? 1 : 0.2;
                                    
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
                                        // Draw regular node
                                        ctx.beginPath();
                                        ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
                                        ctx.fillStyle = color;
                                        ctx.fill();
                                        
                                        // Border for hovered
                                        if (isHovered) {
                                            ctx.strokeStyle = color;
                                            ctx.lineWidth = 3;
                                            ctx.globalAlpha = 1;
                                            ctx.stroke();
                                        }
                                    }
                                    
                                    // Draw label for important nodes or hovered (but not for posts)
                                    if (node.type !== 'post' && (isHovered || connections > 5 || globalScale > 1.5)) {
                                        ctx.globalAlpha = isRelated ? 1 : 0.3;
                                        const label = node.label && node.label.length > 20 ? node.label.slice(0, 20) + '...' : node.label;
                                        const fontSize = Math.max(12 / globalScale, 10);
                                        ctx.font = `${fontSize}px Inter, sans-serif`;
                                        ctx.fillStyle = hoveredNode ? '#1F2937' : '#6B7280';
                                        ctx.textAlign = 'center';
                                        ctx.textBaseline = 'top';
                                        ctx.fillText(label as string, node.x!, node.y! + size + 2);
                                    }
                                    
                                    ctx.globalAlpha = 1;
                                }}
                                linkCanvasObjectMode={() => 'after'}
                                linkCanvasObject={(link, ctx) => {
                                    const source = link.source as any;
                                    const target = link.target as any;
                                    
                                    if (!source.id || !target.id) return;
                                    
                                    const isRelated = !hoveredNode || (relatedNodes.has(source.id) && relatedNodes.has(target.id));
                                    
                                    ctx.globalAlpha = isRelated ? 0.6 : 0.1;
                                    
                                    // Link styling based on type
                                    switch ((link as any).type) {
                                        case 'authored':
                                            ctx.strokeStyle = '#3B82F6';
                                            ctx.lineWidth = 2;
                                            break;
                                        case 'mentions_profile':
                                            ctx.strokeStyle = '#8B5CF6';
                                            ctx.lineWidth = 1.5;
                                            ctx.setLineDash([5, 5]);
                                            break;
                                        case 'mentions_project':
                                            ctx.strokeStyle = '#F59E0B';
                                            ctx.lineWidth = 1.5;
                                            ctx.setLineDash([5, 5]);
                                            break;
                                        case 'contributes':
                                            ctx.strokeStyle = '#EF4444';
                                            ctx.lineWidth = 2.5;
                                            break;
                                        default:
                                            ctx.strokeStyle = '#9CA3AF';
                                            ctx.lineWidth = 1;
                                    }
                                    
                                    ctx.beginPath();
                                    ctx.moveTo(source.x, source.y);
                                    ctx.lineTo(target.x, target.y);
                                    ctx.stroke();
                                    ctx.setLineDash([]);
                                    ctx.globalAlpha = 1;
                                }}
                                nodePointerAreaPaint={(node, color, ctx) => {
                                    // Make the entire node clickable
                                    let baseSize = 5;
                                    
                                    if (node.type === 'profile') {
                                        baseSize = 8;
                                    } else if (node.type === 'project') {
                                        baseSize = 8;
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
                                d3Force="link"
                                d3AlphaDecay={0.02}
                                d3VelocityDecay={0.3}
                                warmupTicks={100}
                                onEngineStop={() => {}}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}