'use client';

import { useEffect, useState } from 'react';
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

            setGraphData({
                nodes: [...profileNodes, ...postNodes],
                links,
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
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4" style={{ height: 600 }}>
                        <ForceGraph2D
                            graphData={graphData}
                            nodeLabel={(node: any) => node.label}
                            nodeAutoColorBy="type"
                            linkDirectionalArrowLength={6}
                            linkDirectionalArrowRelPos={1}
                            nodeCanvasObjectMode={() => 'after'}
                            nodeCanvasObject={(node, ctx, globalScale) => {
                                const label = node.label;
                                const fontSize = 12 / globalScale;
                                ctx.font = `${fontSize}px Sans-Serif`;
                                ctx.fillStyle = node.type === 'profile' ? '#6366f1' : '#10b981';
                                ctx.fillText(label, node.x as number + 8, node.y as number + 8);
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
} 