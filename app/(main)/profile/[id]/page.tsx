'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Profile } from '../../../models/Profile';

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

      // Fetch projects
      const { data: contributionsData } = await supabase
        .from('contributions')
        .select(`
          role,
          projects (
            id,
            title,
            status
          )
        `)
        .eq('person_id', profileId);

      setProfile({
        ...profileData,
        skills: skillsData?.map(s => s.skill) || [],
        educations: educationData || [],
        experiences: experienceData || [],
        posts: postsData || [],
        projects: contributionsData?.map(c => ({
          ...c.projects,
          role: c.role
        })) || []
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          ← Back
        </button>

        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {profile.name}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-1">
            {profile.title}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {profile.location} • {profile.email}
          </p>
          {profile.bio && (
            <p className="text-gray-700 dark:text-gray-300">{profile.bio}</p>
          )}
        </div>

        {/* Skills */}
        {profile.skills.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Experience */}
        {profile.experiences.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Experience</h2>
            <div className="space-y-4">
              {profile.experiences.map((exp) => (
                <div key={exp.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {exp.role} at {exp.company}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(exp.start_date).getFullYear()} - {exp.end_date ? new Date(exp.end_date).getFullYear() : 'Present'}
                  </p>
                  {exp.description && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{exp.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {profile.educations.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Education</h2>
            <div className="space-y-3">
              {profile.educations.map((edu) => (
                <div key={edu.id}>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {edu.degree} - {edu.school}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{edu.year}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {profile.projects.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Projects</h2>
            <div className="grid gap-3">
              {profile.projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{project.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{project.role}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    project.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    project.status === 'paused' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {project.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Posts */}
        {profile.posts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Posts</h2>
            <div className="space-y-4">
              {profile.posts.map((post) => (
                <div key={post.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                  <p className="text-gray-700 dark:text-gray-300">{post.content}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {new Date(post.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}