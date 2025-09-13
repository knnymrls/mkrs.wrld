'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import ProjectRequestCard from '@/app/components/features/ProjectRequestCard';
import ProjectRequestForm from '@/app/components/features/ProjectRequestForm';
import ProjectFilters from '@/app/components/features/ProjectFilters';
import { ProjectRequest } from '@/app/models/ProjectRequest';
import { getEmbedding } from '@/lib/embeddings';
import { Plus, Briefcase } from 'lucide-react';

export default function ProjectBoardPage() {
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ProjectRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    skills: [] as string[],
    timeCommitment: '',
    urgency: ''
  });
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);

  const { user } = useAuth();

  useEffect(() => {
    fetchProjectRequests();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [requests, filters]);

  useEffect(() => {
    if (user && showForm) {
    }
  }, [user, showForm]);

  const fetchProjectRequests = async () => {
    try {
      const { data: requestsData, error: requestsError } = await supabase
        .from('project_requests')
        .select(`
          *,
          creator:profiles!project_requests_created_by_fkey(id, name, title, avatar_url),
          interests:project_interests(
            id,
            interested_user_id,
            status
          )
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      const processedRequests = requestsData?.map(request => ({
        ...request,
        interest_count: request.interests?.filter((i: any) => i.status === 'interested').length || 0,
        is_interested: request.interests?.some((i: any) => i.interested_user_id === user?.id && i.status === 'interested') || false
      })) || [];

      setRequests(processedRequests);

      // Extract unique skills
      const skills = new Set<string>();

      processedRequests.forEach(request => {
        request.skills_needed?.forEach((skill: string) => skills.add(skill));
      });

      setAvailableSkills(Array.from(skills).sort());
    } catch (error) {
      console.error('Error fetching project requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...requests];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(request =>
        request.title.toLowerCase().includes(searchLower) ||
        request.description.toLowerCase().includes(searchLower) ||
        request.skills_needed.some(skill => skill.toLowerCase().includes(searchLower))
      );
    }

    // Skills filter
    if (filters.skills.length > 0) {
      filtered = filtered.filter(request =>
        filters.skills.some(skill => request.skills_needed.includes(skill))
      );
    }

    // Time commitment filter
    if (filters.timeCommitment) {
      filtered = filtered.filter(request => request.time_commitment === filters.timeCommitment);
    }

    // Urgency filter
    if (filters.urgency) {
      filtered = filtered.filter(request => request.urgency === filters.urgency);
    }


    setFilteredRequests(filtered);
  };

  const handleCreateRequest = async (data: any) => {
    if (!user?.id) {
      alert('You must be logged in to create a project request');
      return;
    }

    try {
      console.log('Creating project request with data:', data);
      console.log('User ID:', user.id);

      // Generate embedding for the request
      const embeddingText = `${data.title} ${data.description} ${data.skills_needed.join(' ')}`;
      console.log('Generating embedding for:', embeddingText);

      const embedding = await getEmbedding(embeddingText);
      console.log('Embedding generated, length:', embedding?.length);

      const insertData = {
        ...data,
        created_by: user.id,
        embedding
      };

      console.log('Inserting project request:', insertData);

      const { data: newRequest, error } = await supabase
        .from('project_requests')
        .insert(insertData)
        .select(`
          *,
          creator:profiles!project_requests_created_by_fkey(id, name, title, avatar_url)
        `)
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        throw error;
      }

      setRequests([newRequest, ...requests]);
      setShowForm(false);
    } catch (error) {
      console.error('Error creating project request:', error);
      alert('Failed to create project request. Please try again.');
    }
  };

  const handleInterestToggle = async (requestId: string) => {
    if (!user) {
      alert('Please sign in to show interest');
      return;
    }

    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) return;

      if (request.is_interested) {
        // Remove interest
        const { error } = await supabase
          .from('project_interests')
          .delete()
          .eq('project_request_id', requestId)
          .eq('interested_user_id', user.id);

        if (error) throw error;
      } else {
        // Add interest
        const { error } = await supabase
          .from('project_interests')
          .insert({
            project_request_id: requestId,
            interested_user_id: user.id,
            status: 'interested'
          });

        if (error) throw error;
      }

      // Update local state
      setRequests(requests.map(r =>
        r.id === requestId
          ? {
            ...r,
            is_interested: !r.is_interested,
            interest_count: r.is_interested ? (r.interest_count || 1) - 1 : (r.interest_count || 0) + 1
          }
          : r
      ));
    } catch (error) {
      console.error('Error toggling interest:', error);
      alert('Failed to update interest. Please try again.');
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-onsurface-primary flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-primary" />
            Project Board
          </h1>
          <p className="text-onsurface-secondary mt-2">
            Find interesting projects to contribute to or post your own project needs
          </p>
        </div>
        {user && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-surface-container rounded-md hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-5 h-5" />
            Post Project
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <ProjectFilters
            filters={filters}
            onFilterChange={setFilters}
            availableSkills={availableSkills}
          />
        </div>

        <div className="lg:col-span-3">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 bg-surface-container rounded-lg">
              <Briefcase className="w-12 h-12 text-onsurface-secondary mx-auto mb-4" />
              <p className="text-onsurface-secondary text-lg">
                {filters.search || filters.skills.length > 0 || filters.timeCommitment || filters.urgency
                  ? 'No project requests match your filters'
                  : 'No open project requests yet'}
              </p>
              {user && !filters.search && filters.skills.length === 0 && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 text-primary hover:text-primary/80 transition-colors"
                >
                  Be the first to post a project!
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredRequests.map(request => (
                <ProjectRequestCard
                  key={request.id}
                  request={request}
                  onInterestClick={() => handleInterestToggle(request.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <ProjectRequestForm
          onSubmit={handleCreateRequest}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}