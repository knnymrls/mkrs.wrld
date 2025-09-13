'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Profile } from '../../../models/Profile';
import Image from 'next/image';
import { User } from 'lucide-react';
import SocialLinks from '../../../components/features/SocialLinks';
import ProjectIcon from '../../../components/ui/ProjectIcon';

interface ContributionData {
  role: string;
  start_date: string | null;
  end_date: string | null;
  projects: {
    id: string;
    title: string;
    status: string;
    description: string | null;
  } | null;
}

interface ProfileWithDetails extends Profile {
  skills: string[];
  educations: Array<{
    id: string;
    school: string;
    degree: string;
    year: string;
  }>;
  experiences: Array<{
    id: string;
    company: string;
    role: string;
    start_date: string;
    end_date: string | null;
    description: string | null;
  }>;
  posts: Array<{
    id: string;
    content: string;
    created_at: string;
  }>;
  projects: Array<{
    id: string;
    title: string;
    status: string;
    role: string;
    description?: string;
    start_date?: string | null;
    end_date?: string | null;
    contributors?: Array<{
      id: string;
      name: string;
      avatar_url?: string;
    }>;
  }>;
  createdProjects: Array<{
    id: string;
    title: string;
    status: string;
    description?: string;
    created_at: string;
    image_url?: string;
    icon?: string;
  }>;
}

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params.id as string;
  
  const [profile, setProfile] = useState<ProfileWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profileId) {
      fetchProfile();
    }
  }, [profileId]);

  const fetchProfile = async () => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (profileError) throw profileError;

      // Fetch skills
      const { data: skillsData } = await supabase
        .from('skills')
        .select('skill')
        .eq('profile_id', profileId);

      // Fetch education
      const { data: educationData } = await supabase
        .from('educations')
        .select('*')
        .eq('profile_id', profileId)
        .order('year', { ascending: false });

      // Fetch experience
      const { data: experienceData } = await supabase
        .from('experiences')
        .select('*')
        .eq('profile_id', profileId)
        .order('start_date', { ascending: false });

      // Fetch posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, content, created_at')
        .eq('author_id', profileId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch projects created by the user
      const { data: createdProjects } = await supabase
        .from('projects')
        .select('*')
        .eq('created_by', profileId)
        .order('created_at', { ascending: false });

      // Fetch projects with contributors
      const { data: contributionsData } = await supabase
        .from('contributions')
        .select(`
          role,
          start_date,
          end_date,
          projects (
            id,
            title,
            status,
            description
          )
        `)
        .eq('person_id', profileId) as { data: ContributionData[] | null };

      // For each project, fetch other contributors
      const projectsWithContributors = await Promise.all(
        (contributionsData || []).map(async (contribution) => {
          if (!contribution.projects) return null;
          
          const { data: projectContributors } = await supabase
            .from('contributions')
            .select(`
              profiles (
                id,
                name,
                avatar_url
              )
            `)
            .eq('project_id', contribution.projects.id)
            .neq('person_id', profileId)
            .limit(4);

          return {
            ...contribution.projects,
            role: contribution.role,
            start_date: contribution.start_date,
            end_date: contribution.end_date,
            contributors: projectContributors?.map(c => c.profiles).filter(Boolean) || []
          };
        })
      );

      setProfile({
        ...profileData,
        skills: skillsData?.map(s => s.skill) || [],
        educations: educationData || [],
        experiences: experienceData || [],
        posts: postsData || [],
        projects: projectsWithContributors.filter(p => p !== null) || [],
        createdProjects: createdProjects || []
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatDateRange = (startDate: string, endDate: string | null) => {
    const start = formatDate(startDate);
    const end = endDate ? formatDate(endDate) : 'Present';
    return `${start} - ${end}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-onsurface-secondary">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-onsurface-secondary">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-9 py-6 sm:py-8 lg:py-12">
        {/* Profile Header - Centered */}
        <div className="text-center mb-12">
          <div className="mb-6">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.name || 'Profile'}
                width={120}
                height={120}
                className="rounded-full mx-auto"
              />
            ) : (
              <div className="w-[120px] h-[120px] rounded-full bg-surface-container-muted flex items-center justify-center mx-auto">
                <User size={60} className="text-onsurface-secondary" />
              </div>
            )}
          </div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            {profile.name}
          </h1>
          <p className="text-lg text-onsurface-secondary">
            {profile.title} in {profile.location}
          </p>
        </div>

        {/* About Section */}
        {profile.bio && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-4">About</h2>
            <p className="text-onsurface-primary leading-relaxed">
              {profile.bio}
            </p>
          </section>
        )}

        {/* Social Links Section */}
        <section className="mb-12">
          <SocialLinks profileId={profileId} />
        </section>

        {/* Created Projects Section */}
        {profile.createdProjects.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-4">Created Projects</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {profile.createdProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="border border-border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <ProjectIcon icon={project.icon} size={24} />
                      <div>
                        <h3 className="text-lg font-medium text-foreground">
                          {project.title}
                        </h3>
                        <span className="text-sm text-onsurface-secondary capitalize">
                          {project.status || 'Active'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {project.description && (
                    <p className="text-sm text-onsurface-secondary line-clamp-2 mb-3">
                      {project.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-onsurface-secondary">
                      Created {new Date(project.created_at).toLocaleDateString()}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/projects/${project.id}`);
                      }}
                      className="text-sm text-primary hover:text-primary-hover transition-colors"
                    >
                      View Project →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contributions Section */}
        {profile.projects.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-4">Contributions</h2>
            <div className="space-y-4">
              {profile.projects.map((project) => (
                <div key={project.id} className="border-b border-border pb-6 last:border-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-foreground mb-1">
                        {project.title}
                      </h3>
                      <p className="text-onsurface-secondary text-sm">
                        {project.description || profile.bio || 'No description available'}
                      </p>
                    </div>
                    <span className="text-sm text-onsurface-secondary ml-4">
                      {project.start_date && project.end_date ? formatDateRange(project.start_date, project.end_date) : ''}
                    </span>
                  </div>
                  
                  <div className="bg-surface-container rounded-md p-4">
                    <p className="text-sm font-medium text-onsurface-primary mb-2">
                      {project.role}
                    </p>
                    <p className="text-sm text-onsurface-secondary mb-3">
                      {project.description || 'No description available'}
                    </p>
                    
                    {project.contributors && project.contributors.length > 0 && (
                      <div className="flex items-center -space-x-2">
                        {project.contributors.slice(0, 4).map((contributor) => (
                          <div key={contributor.id} className="relative">
                            {contributor.avatar_url ? (
                              <Image
                                src={contributor.avatar_url}
                                alt={contributor.name}
                                width={32}
                                height={32}
                                className="rounded-full border-2 border-background"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-surface-container-muted border-2 border-background flex items-center justify-center">
                                <User size={16} className="text-onsurface-secondary" />
                              </div>
                            )}
                          </div>
                        ))}
                        {project.contributors.length > 4 && (
                          <div className="w-8 h-8 rounded-full bg-surface-container-muted border-2 border-background flex items-center justify-center text-xs font-medium text-onsurface-primary">
                            +{project.contributors.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/projects/${project.id}`);
                      }}
                      className="text-sm text-onsurface-secondary hover:text-foreground transition-colors"
                    >
                      View Project
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Work Experience */}
        {profile.experiences.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-4">Work Experience</h2>
            <div className="space-y-4">
              {profile.experiences.map((exp) => (
                <div key={exp.id} className="border-b border-border pb-4 last:border-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">
                        {exp.role} @ {exp.company}
                      </h3>
                      <p className="text-sm text-onsurface-secondary">
                        {exp.company}
                      </p>
                    </div>
                    <span className="text-sm text-onsurface-secondary whitespace-nowrap ml-4">
                      {formatDateRange(exp.start_date, exp.end_date)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {profile.educations.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-4">Education</h2>
            <div className="space-y-4">
              {profile.educations.map((edu) => (
                <div key={edu.id} className="border-b border-border pb-4 last:border-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">
                        {edu.degree} @ {edu.school}
                      </h3>
                      <p className="text-sm text-onsurface-secondary">
                        {edu.school}
                      </p>
                    </div>
                    <span className="text-sm text-onsurface-secondary whitespace-nowrap ml-4">
                      {formatDateRange(edu.year, edu.year)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}