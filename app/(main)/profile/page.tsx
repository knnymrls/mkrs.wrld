'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getEmbedding } from '@/lib/embeddings';
import { Education } from '../../models/Education';
import { Experience } from '../../models/Experience';
import { Link } from '../../models/Link';
import { Skill } from '../../models/Skill';

export default function Profile() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [profile, setProfile] = useState<{
        name: string;
        bio: string;
        embedding: number[];
        location: string;
        title: string;
    } | null>(null);
    const [educations, setEducations] = useState<Education[]>([]);
    const [experiences, setExperiences] = useState<Experience[]>([]);
    const [links, setLinks] = useState<Link[]>([]);
    const [skills, setSkills] = useState<Skill[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        bio: '',
        skills: '',
        location: '',
        title: '',
    });

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;

            // Fetch profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('name, bio, location, title, embedding')
                .eq('id', user.id)
                .single();

            if (profileError) {
                console.error('Error fetching profile:', profileError);
            } else {
                setProfile(profileData);
                setFormData({
                    name: profileData?.name || '',
                    bio: profileData?.bio || '',
                    skills: '', // Will be populated separately
                    location: profileData?.location || '',
                    title: profileData?.title || '',
                });
            }

            // Fetch skills
            const { data: skillsData, error: skillsError } = await supabase
                .from('skills')
                .select('*')
                .eq('profile_id', user.id);

            if (skillsError) {
                console.error('Error fetching skills:', skillsError);
            } else {
                setSkills(skillsData || []);
                // Populate skills in form data
                setFormData(prev => ({
                    ...prev,
                    skills: skillsData?.map(s => s.skill).join(', ') || ''
                }));
            }

            // Fetch educations
            const { data: educationData, error: educationError } = await supabase
                .from('educations')
                .select('*')
                .eq('profile_id', user.id)
                .order('year', { ascending: false });

            if (educationError) {
                console.error('Error fetching educations:', educationError);
            } else {
                setEducations(educationData || []);
            }

            // Fetch experiences
            const { data: experienceData, error: experienceError } = await supabase
                .from('experiences')
                .select('*')
                .eq('profile_id', user.id)
                .order('start_date', { ascending: false });

            if (experienceError) {
                console.error('Error fetching experiences:', experienceError);
            } else {
                setExperiences(experienceData || []);
            }

            // Fetch links
            const { data: linkData, error: linkError } = await supabase
                .from('links')
                .select('*')
                .eq('profile_id', user.id);

            if (linkError) {
                console.error('Error fetching links:', linkError);
            } else {
                setLinks(linkData || []);
            }
        };

        fetchProfile();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        // Build comprehensive embedding input including education and experience
        const educationText = educations.map(edu => `${edu.degree} from ${edu.school}`).join('. ');
        const experienceText = experiences.map(exp => `${exp.role} at ${exp.company}`).join('. ');
        
        const embeddingInput = `${formData.bio} ${formData.skills || ''} ${formData.title || ''} ${formData.location || ''} ${educationText} ${experienceText}`;
        const embedding = await getEmbedding(embeddingInput);

        const { error } = await supabase
            .from('profiles')
            .update({
                name: formData.name,
                bio: formData.bio,
                location: formData.location,
                title: formData.title,
                embedding,
            })
            .eq('id', user.id);

        if (error) {
            console.error('Error updating profile:', error);
        } else {
            // Update skills separately
            const newSkills = formData.skills ? formData.skills.split(',').map((s) => s.trim()).filter(s => s) : [];
            
            // Delete existing skills
            await supabase
                .from('skills')
                .delete()
                .eq('profile_id', user.id);
            
            // Insert new skills
            if (newSkills.length > 0) {
                const { error: skillsError } = await supabase
                    .from('skills')
                    .insert(newSkills.map(skill => ({
                        profile_id: user.id,
                        skill
                    })));
                
                if (skillsError) {
                    console.error('Error updating skills:', skillsError);
                }
            }
            
            // Refetch skills
            const { data: updatedSkills } = await supabase
                .from('skills')
                .select('*')
                .eq('profile_id', user.id);
            
            setSkills(updatedSkills || []);
            setProfile({
                ...profile!,
                name: formData.name,
                bio: formData.bio,
                location: formData.location,
                title: formData.title,
                embedding,
            });
            setIsEditing(false);
        }
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500">Loading...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            {isEditing ? 'Cancel' : 'Edit Profile'}
                        </button>
                    </div>

                    {isEditing ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    id="username"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                    placeholder="e.g. Software Engineer, Product Manager"
                                />
                            </div>
                            <div>
                                <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Location
                                </label>
                                <input
                                    type="text"
                                    id="location"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                    placeholder="e.g. San Francisco, CA"
                                />
                            </div>
                            <div>
                                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Bio
                                </label>
                                <textarea
                                    id="bio"
                                    rows={4}
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="skills" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Skills (comma-separated)
                                </label>
                                <input
                                    type="text"
                                    id="skills"
                                    value={formData.skills}
                                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Save Changes
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</h3>
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{profile?.name || 'Not set'}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Title</h3>
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{profile?.title || 'Not set'}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</h3>
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{profile?.location || 'Not set'}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Bio</h3>
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{profile?.bio || 'No bio yet'}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Skills</h3>
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{skills.length > 0 ? skills.map(s => s.skill).join(', ') : 'No skills set'}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</h3>
                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{user.email}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Education Section */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Education</h2>
                        {!isEditing && (
                            <button
                                onClick={() => router.push('/profile/education/new')}
                                className="text-sm text-indigo-600 hover:text-indigo-500"
                            >
                                Add Education
                            </button>
                        )}
                    </div>
                    {educations.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No education added yet</p>
                    ) : (
                        <div className="space-y-3">
                            {educations.map((edu) => (
                                <div key={edu.id} className="border-l-4 border-indigo-500 pl-4">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{edu.degree}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">{edu.school}</p>
                                    {edu.year && <p className="text-sm text-gray-500 dark:text-gray-400">{edu.year}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Experience Section */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Experience</h2>
                        {!isEditing && (
                            <button
                                onClick={() => router.push('/profile/experience/new')}
                                className="text-sm text-indigo-600 hover:text-indigo-500"
                            >
                                Add Experience
                            </button>
                        )}
                    </div>
                    {experiences.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No experience added yet</p>
                    ) : (
                        <div className="space-y-4">
                            {experiences.map((exp) => (
                                <div key={exp.id} className="border-l-4 border-green-500 pl-4">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{exp.role}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">{exp.company}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {exp.start_date} - {exp.end_date || 'Present'}
                                    </p>
                                    {exp.description && (
                                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{exp.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Links Section */}
                {links.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mt-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Links</h2>
                        <div className="space-y-2">
                            {links.map((link) => (
                                <div key={link.id}>
                                    <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-indigo-600 hover:text-indigo-500"
                                    >
                                        {link.platform}: {link.url}
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 