'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/app/context/AuthContext';
import { ProjectRequest, ProjectInterest, TIME_COMMITMENT_LABELS, URGENCY_LABELS, STATUS_LABELS } from '@/app/models/ProjectRequest';
import { ArrowLeft, Clock, Users, AlertCircle, Building2, User, CheckCircle, XCircle, MessageSquare, Rocket } from 'lucide-react';
import ConvertToProjectModal from '@/app/components/features/ConvertToProjectModal';
import { getEmbedding } from '@/lib/embeddings';

export default function ProjectRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [request, setRequest] = useState<ProjectRequest | null>(null);
  const [interests, setInterests] = useState<ProjectInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInterestForm, setShowInterestForm] = useState(false);
  const [interestMessage, setInterestMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  useEffect(() => {
    fetchProjectRequest();
  }, [params.id]);

  const fetchProjectRequest = async () => {
    try {
      console.log('Fetching project request with ID:', params.id);
      
      // Fetch project request
      const { data: requestData, error: requestError } = await supabase
        .from('project_requests')
        .select(`
          *,
          creator:profiles!project_requests_created_by_fkey(id, name, title, avatar_url, email, bio, location)
        `)
        .eq('id', params.id)
        .single();

      if (requestError) {
        console.error('Supabase error fetching project request:', requestError);
        throw requestError;
      }

      if (!requestData) {
        console.error('No project request found with ID:', params.id);
        throw new Error('Project request not found');
      }

      // Fetch interests if user is the creator
      if (user?.id === requestData.created_by) {
        const { data: interestsData, error: interestsError } = await supabase
          .from('project_interests')
          .select(`
            *,
            interested_user:profiles!project_interests_interested_user_id_fkey(
              id, name, title, avatar_url, bio
            )
          `)
          .eq('project_request_id', params.id)
          .order('created_at', { ascending: false });

        if (interestsError) throw interestsError;
        
        // Fetch skills for each interested user
        const interestsWithSkills = await Promise.all(
          (interestsData || []).map(async (interest) => {
            if (interest.interested_user) {
              const { data: skills } = await supabase
                .from('skills')
                .select('skill')
                .eq('profile_id', interest.interested_user.id);
              
              return {
                ...interest,
                interested_user: {
                  ...interest.interested_user,
                  skills: skills?.map(s => s.skill) || []
                }
              };
            }
            return interest;
          })
        );
        
        setInterests(interestsWithSkills);
      } else if (user) {
        // Check if current user has expressed interest
        const { data: userInterest } = await supabase
          .from('project_interests')
          .select('*')
          .eq('project_request_id', params.id)
          .eq('interested_user_id', user.id)
          .single();

        if (userInterest) {
          setInterests([userInterest]);
        }
      }

      setRequest(requestData);
    } catch (error) {
      console.error('Error fetching project request:', error);
      router.push('/project-board');
    } finally {
      setLoading(false);
    }
  };

  const handleExpressInterest = async () => {
    if (!user) {
      alert('Please sign in to express interest');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('project_interests')
        .insert({
          project_request_id: params.id,
          interested_user_id: user.id,
          message: interestMessage.trim() || null,
          status: 'interested'
        });

      if (error) throw error;

      setShowInterestForm(false);
      setInterestMessage('');
      fetchProjectRequest();
    } catch (error) {
      console.error('Error expressing interest:', error);
      alert('Failed to express interest. You may have already expressed interest in this project.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawInterest = async () => {
    if (!user || !confirm('Are you sure you want to withdraw your interest?')) return;

    try {
      const { error } = await supabase
        .from('project_interests')
        .delete()
        .eq('project_request_id', params.id)
        .eq('interested_user_id', user.id);

      if (error) throw error;
      
      setInterests([]);
      fetchProjectRequest();
    } catch (error) {
      console.error('Error withdrawing interest:', error);
      alert('Failed to withdraw interest');
    }
  };

  const handleUpdateInterestStatus = async (interestId: string, status: 'selected' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('project_interests')
        .update({ status })
        .eq('id', interestId);

      if (error) throw error;

      setInterests(interests.map(i => 
        i.id === interestId ? { ...i, status } : i
      ));

      // If selecting someone, update project status to in_review
      if (status === 'selected' && request) {
        const { error: updateError } = await supabase
          .from('project_requests')
          .update({ status: 'in_review' })
          .eq('id', request.id);

        if (!updateError) {
          setRequest({ ...request, status: 'in_review' });
        }
      }
    } catch (error) {
      console.error('Error updating interest status:', error);
      alert('Failed to update status');
    }
  };

  const handleCloseRequest = async () => {
    if (!confirm('Are you sure you want to close this project request? This will mark it as filled.')) return;

    try {
      const { error } = await supabase
        .from('project_requests')
        .update({ status: 'filled' })
        .eq('id', params.id);

      if (error) throw error;

      setRequest(request ? { ...request, status: 'filled' } : null);
    } catch (error) {
      console.error('Error closing request:', error);
      alert('Failed to close request');
    }
  };

  const handleConvertToProject = async (projectData: any) => {
    try {
      // Generate embedding for the project
      const embeddingText = `${projectData.title} ${projectData.description}`;
      const embedding = await getEmbedding(embeddingText);

      // Create the project
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: projectData.title,
          description: projectData.description,
          status: projectData.status,
          created_by: user?.id,
          embedding
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Add contributors
      const contributionPromises = projectData.contributors.map((contributor: any) =>
        supabase.from('contributions').insert({
          project_id: newProject.id,
          person_id: contributor.user_id,
          role: contributor.role,
          start_date: new Date().toISOString()
        })
      );

      await Promise.all(contributionPromises);

      // Update project request status
      const { error: updateError } = await supabase
        .from('project_requests')
        .update({ status: 'filled' })
        .eq('id', params.id);

      if (updateError) throw updateError;

      // Navigate to the new project
      router.push(`/projects/${newProject.id}`);
    } catch (error) {
      console.error('Error converting to project:', error);
      alert('Failed to create project. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-center text-onsurface-secondary">Project request not found</p>
      </div>
    );
  }

  const isCreator = user?.id === request.created_by;
  const hasExpressedInterest = interests.some(i => i.interested_user_id === user?.id);
  const urgencyColors = {
    low: 'bg-success/10 text-success',
    medium: 'bg-warning/10 text-warning',
    high: 'bg-error/10 text-error'
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/project-board" className="inline-flex items-center gap-2 text-onsurface-secondary hover:text-onsurface-primary mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Project Board
      </Link>

      <div className="bg-surface-container rounded-lg shadow-sm border border-border p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-onsurface-primary mb-2">{request.title}</h1>
            <div className="flex items-center gap-4 text-onsurface-secondary">
              {request.creator && (
                <Link href={`/profile/${request.creator.id}`} className="flex items-center gap-2 hover:text-primary">
                  {request.creator.avatar_url ? (
                    <img src={request.creator.avatar_url} alt={request.creator.name} className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-avatar-bg flex items-center justify-center text-xs font-medium text-onsurface-secondary">
                      {request.creator.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span>{request.creator.name}</span>
                </Link>
              )}
              <span>•</span>
              <span>{new Date(request.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${urgencyColors[request.urgency]}`}>
              {request.urgency.toUpperCase()}
            </span>
            {request.status !== 'open' && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-surface-container-muted text-onsurface-primary">
                {STATUS_LABELS[request.status]}
              </span>
            )}
          </div>
        </div>

        <div className="prose max-w-none mb-8">
          <p className="text-onsurface-primary whitespace-pre-wrap">{request.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="font-semibold text-onsurface-primary mb-3">Skills Needed</h3>
            <div className="flex flex-wrap gap-2">
              {request.skills_needed.map((skill, index) => (
                <span key={index} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-onsurface-secondary">
              <Clock className="w-5 h-5" />
              <span>{TIME_COMMITMENT_LABELS[request.time_commitment]}</span>
            </div>
            <div className="flex items-center gap-2 text-onsurface-secondary">
              <Users className="w-5 h-5" />
              <span>{request.max_participants} spot{request.max_participants !== 1 ? 's' : ''} available</span>
            </div>
            {(request.department || request.division) && (
              <div className="flex items-center gap-2 text-onsurface-secondary">
                <Building2 className="w-5 h-5" />
                <span>{[request.department, request.division].filter(Boolean).join(' • ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {request.status === 'open' && (
          <div className="border-t pt-6">
            {isCreator ? (
              <div className="flex gap-3">
                {interests.filter(i => i.status === 'selected').length > 0 && (
                  <button
                    onClick={() => setShowConvertModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-success text-onsuccess rounded-md hover:bg-success/90 transition-colors"
                  >
                    <Rocket className="w-4 h-4" />
                    Convert to Project
                  </button>
                )}
                <button
                  onClick={handleCloseRequest}
                  className="px-4 py-2 bg-onsurface-secondary text-surface rounded-md hover:bg-onsurface-primary transition-colors"
                >
                  Close Request
                </button>
              </div>
            ) : user && !hasExpressedInterest ? (
              <button
                onClick={() => setShowInterestForm(true)}
                className="px-6 py-2 bg-primary text-onprimary rounded-md hover:bg-primary/90 transition-colors"
              >
                Express Interest
              </button>
            ) : hasExpressedInterest ? (
              <div className="flex items-center gap-4">
                <span className="text-success flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  You've expressed interest
                </span>
                <button
                  onClick={handleWithdrawInterest}
                  className="text-onsurface-secondary hover:text-error text-sm"
                >
                  Withdraw interest
                </button>
              </div>
            ) : (
              <Link href="/auth/signin" className="text-primary hover:text-primary/80">
                Sign in to express interest
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Interest Form Modal */}
      {showInterestForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-onsurface-primary mb-4">Express Interest</h3>
            <textarea
              value={interestMessage}
              onChange={(e) => setInterestMessage(e.target.value)}
              placeholder="Tell them why you're interested and what you can contribute... (optional)"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-32 resize-none mb-4 bg-surface-container text-onsurface-primary"
            />
            <div className="flex gap-3">
              <button
                onClick={handleExpressInterest}
                disabled={submitting}
                className="flex-1 py-2 px-4 bg-primary text-onprimary rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
              <button
                onClick={() => setShowInterestForm(false)}
                className="flex-1 py-2 px-4 bg-surface-container text-onsurface-primary rounded-md hover:bg-surface-container-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interested Users (only visible to creator) */}
      {isCreator && interests.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-onsurface-primary mb-6">Interested Candidates ({interests.length})</h2>
          <div className="space-y-4">
            {interests.map((interest) => (
              <div key={interest.id} className="bg-surface-container rounded-lg shadow-sm border border-border p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {interest.interested_user?.avatar_url ? (
                        <img 
                          src={interest.interested_user.avatar_url} 
                          alt={interest.interested_user.name}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-surface-container-muted flex items-center justify-center">
                          <User className="w-5 h-5 text-onsurface-secondary" />
                        </div>
                      )}
                      <div>
                        <Link 
                          href={`/profile/${interest.interested_user?.id}`}
                          className="font-semibold text-onsurface-primary hover:text-primary"
                        >
                          {interest.interested_user?.name}
                        </Link>
                        {interest.interested_user?.title && (
                          <p className="text-sm text-onsurface-secondary">{interest.interested_user.title}</p>
                        )}
                      </div>
                    </div>
                    
                    {interest.message && (
                      <div className="bg-surface-container-muted rounded p-3 mb-3">
                        <p className="text-onsurface-primary text-sm">{interest.message}</p>
                      </div>
                    )}

                    {interest.interested_user?.skills && interest.interested_user.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {interest.interested_user.skills.slice(0, 5).map((skill, idx) => (
                          <span key={idx} className="px-2 py-1 bg-surface-container text-onsurface-primary rounded text-xs">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-sm text-onsurface-secondary">
                      Applied {new Date(interest.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {interest.status === 'interested' && request.status === 'open' && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleUpdateInterestStatus(interest.id, 'selected')}
                        className="px-3 py-1 bg-success text-onsuccess rounded text-sm hover:bg-success/90"
                      >
                        Select
                      </button>
                      <button
                        onClick={() => handleUpdateInterestStatus(interest.id, 'rejected')}
                        className="px-3 py-1 bg-error text-onerror rounded text-sm hover:bg-error/90"
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  {interest.status !== 'interested' && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      interest.status === 'selected' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                    }`}>
                      {interest.status === 'selected' ? 'Selected' : 'Declined'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Convert to Project Modal */}
      {showConvertModal && request && (
        <ConvertToProjectModal
          request={request}
          selectedInterests={interests.filter(i => i.status === 'selected')}
          onConfirm={handleConvertToProject}
          onClose={() => setShowConvertModal(false)}
        />
      )}
    </div>
  );
}