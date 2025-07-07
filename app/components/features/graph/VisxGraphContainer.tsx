'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ParentSize } from '@visx/responsive';
import VisxNetworkGraph, { SimulationNode } from './VisxNetworkGraph';
import { ProfileNode, ProjectNode, PostNode, GraphLink } from '@/app/types/graph';
import { Profile } from '@/app/models/Profile';
import { Project } from '@/app/models/Project';
import { Post } from '@/app/models/Post';
import { useRouter } from 'next/navigation';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface VisxGraphContainerProps {
  profiles: Profile[];
  projects: Project[];
  posts: Post[];
  contributions: any[];
  postMentions: any[];
  postProjects: any[];
  selectedDivisions: string[];
  showDivisionGroups: boolean;
  searchQuery: string;
  minConnections: number;
  showPeople: boolean;
  showProjects: boolean;
  showPosts: boolean;
}

const VisxGraphContainer: React.FC<VisxGraphContainerProps> = ({
  profiles,
  projects,
  posts,
  contributions,
  postMentions,
  postProjects,
  selectedDivisions,
  showDivisionGroups,
  searchQuery,
  minConnections,
  showPeople,
  showProjects,
  showPosts
}) => {
  const router = useRouter();
  const [hoveredNode, setHoveredNode] = useState<SimulationNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<SimulationNode | null>(null);
  const zoomControlsRef = useRef({
    onZoomIn: () => {},
    onZoomOut: () => {},
    onZoomReset: () => {}
  });

  // Transform data to graph nodes
  const nodes = useMemo(() => {
    const allNodes: (ProfileNode | ProjectNode | PostNode)[] = [];
    
    console.log('Building nodes:', {
      showPeople,
      showProjects,
      showPosts,
      profileCount: profiles.length,
      projectCount: projects.length,
      postCount: posts.length
    });

    // Add profile nodes
    if (showPeople) {
      profiles.forEach(profile => {
        allNodes.push({
          id: `profile-${profile.id}`,
          type: 'profile',
          name: profile.name,
          title: profile.title,
          location: profile.location,
          avatar_url: profile.avatar_url,
          skills: profile.skills?.split(',').map(s => s.trim()).filter(Boolean) || [],
          division: profile.division,
          department: profile.department,
          team: profile.team
        });
      });
    }

    // Add project nodes
    if (showProjects) {
      projects.forEach(project => {
        allNodes.push({
          id: `project-${project.id}`,
          type: 'project',
          title: project.title,
          description: project.description,
          status: project.status
        });
      });
    }

    // Add post nodes
    if (showPosts) {
      posts.forEach(post => {
        const author = profiles.find(p => p.id === post.author_id);
        allNodes.push({
          id: `post-${post.id}`,
          type: 'post',
          content: post.content,
          authorName: author?.name || 'Unknown',
          created_at: post.created_at
        });
      });
    }

    return allNodes;
  }, [profiles, projects, posts, showPeople, showProjects, showPosts]);

  // Transform data to graph links
  const links = useMemo(() => {
    const allLinks: GraphLink[] = [];

    // Add authorship links (profile -> post)
    if (showPeople && showPosts) {
      posts.forEach(post => {
        allLinks.push({
          source: `profile-${post.author_id}`,
          target: `post-${post.id}`,
          type: 'authored'
        });
      });
    }

    // Add mention links (post -> profile)
    if (showPosts && showPeople) {
      postMentions.forEach(mention => {
        allLinks.push({
          source: `post-${mention.post_id}`,
          target: `profile-${mention.profile_id}`,
          type: 'mentions_profile'
        });
      });
    }

    // Add project mention links (post -> project)
    if (showPosts && showProjects) {
      postProjects.forEach(pp => {
        allLinks.push({
          source: `post-${pp.post_id}`,
          target: `project-${pp.project_id}`,
          type: 'mentions_project'
        });
      });
    }

    // Add contribution links (profile -> project)
    if (showPeople && showProjects) {
      contributions.forEach(contrib => {
        allLinks.push({
          source: `profile-${contrib.person_id}`,
          target: `project-${contrib.project_id}`,
          type: 'contributes'
        });
      });
    }

    return allLinks;
  }, [posts, postMentions, postProjects, contributions, showPeople, showProjects, showPosts]);

  // Handle node click
  const handleNodeClick = (node: SimulationNode) => {
    setSelectedNode(node);
    
    // Navigate to appropriate page
    if (node.type === 'profile') {
      const profileId = node.id.replace('profile-', '');
      router.push(`/profile/${profileId}`);
    } else if (node.type === 'project') {
      const projectId = node.id.replace('project-', '');
      router.push(`/projects/${projectId}`);
    }
  };

  // Handle node hover
  const handleNodeHover = (node: SimulationNode | null) => {
    setHoveredNode(node);
  };

  return (
    <div className="relative w-full h-full">
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => zoomControlsRef.current.onZoomIn()}
          className="bg-gray-900/90 backdrop-blur text-white p-2 rounded-lg hover:bg-gray-800/90 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => zoomControlsRef.current.onZoomOut()}
          className="bg-gray-900/90 backdrop-blur text-white p-2 rounded-lg hover:bg-gray-800/90 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => zoomControlsRef.current.onZoomReset()}
          className="bg-gray-900/90 backdrop-blur text-white p-2 rounded-lg hover:bg-gray-800/90 transition-colors"
          title="Reset Zoom"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      <ParentSize>
        {({ width, height }) => (
          <VisxNetworkGraph
            nodes={nodes}
            links={links}
            width={width}
            height={height}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            selectedDivisions={selectedDivisions}
            showDivisionGroups={showDivisionGroups}
            searchQuery={searchQuery}
            minConnections={minConnections}
            zoomControls={zoomControlsRef.current}
          />
        )}
      </ParentSize>

      {/* Node details tooltip */}
      {hoveredNode && (
        <div className="absolute bottom-4 left-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-sm">
          <h3 className="font-semibold mb-2">
            {hoveredNode.type === 'profile' && hoveredNode.name}
            {hoveredNode.type === 'project' && hoveredNode.title}
            {hoveredNode.type === 'post' && `Post by ${hoveredNode.authorName}`}
          </h3>
          
          {hoveredNode.type === 'profile' && (
            <>
              {hoveredNode.title && <p className="text-sm text-gray-300">{hoveredNode.title}</p>}
              {hoveredNode.division && <p className="text-sm text-gray-300">Division: {hoveredNode.division}</p>}
              {hoveredNode.skills && hoveredNode.skills.length > 0 && (
                <p className="text-sm text-gray-300 mt-1">
                  Skills: {hoveredNode.skills.slice(0, 3).join(', ')}
                  {hoveredNode.skills.length > 3 && '...'}
                </p>
              )}
            </>
          )}
          
          {hoveredNode.type === 'project' && (
            <>
              <p className="text-sm text-gray-300">{hoveredNode.description}</p>
              {hoveredNode.status && (
                <span className="inline-block mt-2 px-2 py-1 text-xs rounded-full bg-gray-700">
                  {hoveredNode.status}
                </span>
              )}
            </>
          )}
          
          {hoveredNode.type === 'post' && (
            <p className="text-sm text-gray-300">
              {hoveredNode.content && hoveredNode.content.length > 100
                ? hoveredNode.content.substring(0, 100) + '...'
                : hoveredNode.content}
            </p>
          )}
          
          <p className="text-xs text-gray-400 mt-2">
            {hoveredNode.connectionCount} connections
          </p>
        </div>
      )}
    </div>
  );
};

export default VisxGraphContainer;