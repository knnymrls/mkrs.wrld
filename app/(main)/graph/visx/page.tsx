'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { ZoomIn, ZoomOut, Maximize2, Filter, Users, Briefcase, MessageCircle, X, ChevronRight, Search } from 'lucide-react';
import GraphModeSelector, { GraphMode } from '@/app/components/features/graph/GraphModeSelector';
import SkillRadarVisualization from '@/app/components/features/graph/SkillRadarVisualization';
import EnhancedGraphControls from '@/app/components/features/graph/EnhancedGraphControls';
import DivisionLegend from '@/app/components/features/graph/DivisionLegend';
import VisxGraphContainer from '@/app/components/features/graph/VisxGraphContainer';
import { NELNET_DIVISIONS } from '@/lib/constants/divisions';
import { Profile } from '@/app/models/Profile';
import { Project } from '@/app/models/Project';
import { Post } from '@/app/models/Post';

interface FilterState {
    showProfiles: boolean;
    showPosts: boolean;
    showProjects: boolean;
    minConnections: number;
}

export default function GraphPage() {
    const router = useRouter();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [contributions, setContributions] = useState<any[]>([]);
    const [postMentions, setPostMentions] = useState<any[]>([]);
    const [postProjects, setPostProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        showProfiles: true,
        showPosts: true,
        showProjects: true,
        minConnections: 0
    });
    const [graphMode, setGraphMode] = useState<GraphMode>('network');
    const [selectedDivisions, setSelectedDivisions] = useState<string[]>(NELNET_DIVISIONS.slice());
    const [showDivisionGroups, setShowDivisionGroups] = useState(false);

    // Fetch all data
    useEffect(() => {
        fetchGraphData();
    }, []);

    const fetchGraphData = async () => {
        setLoading(true);
        try {
            // Fetch profiles
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (profileError) throw profileError;
            setProfiles(profileData || []);

            // Fetch projects
            const { data: projectData, error: projectError } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (projectError) throw projectError;
            setProjects(projectData || []);

            // Fetch posts
            const { data: postData, error: postError } = await supabase
                .from('posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (postError) throw postError;
            setPosts(postData || []);

            // Fetch contributions
            const { data: contributionData, error: contributionError } = await supabase
                .from('contributions')
                .select('*');

            if (contributionError) throw contributionError;
            setContributions(contributionData || []);

            // Fetch post mentions
            const { data: mentionData, error: mentionError } = await supabase
                .from('post_mentions')
                .select('*');

            if (mentionError) throw mentionError;
            setPostMentions(mentionData || []);

            // Fetch post projects
            const { data: postProjectData, error: postProjectError } = await supabase
                .from('post_projects')
                .select('*');

            if (postProjectError) throw postProjectError;
            setPostProjects(postProjectData || []);
        } catch (error) {
            console.error('Error fetching graph data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDivisionToggle = (division: string) => {
        setSelectedDivisions(prev => 
            prev.includes(division) 
                ? prev.filter(d => d !== division)
                : [...prev, division]
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Building knowledge graph...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-screen w-full bg-[#0A0A0B] overflow-hidden">
            {/* Controls */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                <GraphModeSelector mode={graphMode} onModeChange={setGraphMode} />
                
                {graphMode === 'network' && (
                    <>
                        {/* Search */}
                        <div className="bg-gray-900/90 backdrop-blur rounded-lg p-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search nodes..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
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

            {/* Filter Panel */}
            {showFilters && graphMode === 'network' && (
                <EnhancedGraphControls
                    filters={filters}
                    onFiltersChange={setFilters}
                    selectedDivisions={selectedDivisions}
                    showDivisionGroups={showDivisionGroups}
                    onDivisionToggle={handleDivisionToggle}
                    onShowDivisionGroupsChange={setShowDivisionGroups}
                    onClose={() => setShowFilters(false)}
                />
            )}

            {/* Division Legend */}
            {graphMode === 'network' && selectedDivisions.length > 0 && (
                <div className="absolute bottom-4 right-4 z-10">
                    <DivisionLegend visibleDivisions={selectedDivisions} />
                </div>
            )}

            {/* Graph Visualization */}
            {graphMode === 'network' ? (
                <VisxGraphContainer
                    profiles={profiles}
                    projects={projects}
                    posts={posts}
                    contributions={contributions}
                    postMentions={postMentions}
                    postProjects={postProjects}
                    selectedDivisions={selectedDivisions}
                    showDivisionGroups={showDivisionGroups}
                    searchQuery={searchQuery}
                    minConnections={filters.minConnections}
                    showPeople={filters.showProfiles}
                    showProjects={filters.showProjects}
                    showPosts={filters.showPosts}
                />
            ) : (
                <SkillRadarVisualization profiles={profiles} />
            )}
        </div>
    );
}