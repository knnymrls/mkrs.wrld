'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { getEmbedding } from '@/lib/embeddings/index';
import { uploadAvatar } from '@/lib/supabase/storage';
import ImageUploadWithCrop from '../../components/ui/ImageUploadWithCrop';
import { Education } from '../../models/Education';
import { Experience } from '../../models/Experience';
import { Link } from '../../models/Link';
import { Skill } from '../../models/Skill';
import Image from 'next/image';
import { User, Pencil, Trash2, Plus, X } from 'lucide-react';
import SocialLinks from '../../components/features/SocialLinks';
import ProjectIcon from '../../components/ui/ProjectIcon';
import { useRouter as useNextRouter } from 'next/navigation';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  title: string;
  children: React.ReactNode;
}

function EditModal({ isOpen, onClose, onSave, title, children }: EditModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm" style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)' }}>
      <div className="bg-surface-container rounded-3xl shadow-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-onsurface-primary">{title}</h3>
          <button
            onClick={onClose}
            className="text-onsurface-secondary hover:text-onsurface-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface Project {
    id: string;
    title: string;
    description: string | null;
    status: string | null;
    created_at: string;
    icon: string | null;
    image_url: string | null;
}

interface Contribution {
    id: string;
    role: string;
    start_date: string | null;
    end_date: string | null;
    project: {
        id: string;
        title: string;
        description: string | null;
        status: string | null;
    };
}

export default function Profile() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const nextRouter = useNextRouter();
    const [profile, setProfile] = useState<{
        name: string;
        bio: string;
        embedding: number[];
        location: string;
        title: string;
        avatar_url: string | null;
    } | null>(null);
    const [educations, setEducations] = useState<Education[]>([]);
    const [experiences, setExperiences] = useState<Experience[]>([]);
    const [links, setLinks] = useState<Link[]>([]);
    const [skills, setSkills] = useState<Skill[]>([]);
    const [createdProjects, setCreatedProjects] = useState<Project[]>([]);
    const [contributions, setContributions] = useState<Contribution[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        bio: '',
        skills: '',
        location: '',
        title: '',
    });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [removeAvatar, setRemoveAvatar] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    
    // Modal states
    const [editingEducation, setEditingEducation] = useState<Education | null>(null);
    const [editingExperience, setEditingExperience] = useState<Experience | null>(null);

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
                .select('name, bio, location, title, embedding, avatar_url')
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

            // Fetch projects created by the user
            const { data: projectsData, error: projectsError } = await supabase
                .from('projects')
                .select('*')
                .eq('created_by', user.id)
                .order('created_at', { ascending: false });

            if (projectsError) {
                console.error('Error fetching created projects:', projectsError);
            } else {
                setCreatedProjects(projectsData || []);
                console.log('Created projects:', projectsData);
            }

            // Fetch contributions
            const { data: contributionsData, error: contributionsError } = await supabase
                .from('contributions')
                .select(`
                    id,
                    role,
                    start_date,
                    end_date,
                    project:projects (
                        id,
                        title,
                        description,
                        status
                    )
                `)
                .eq('person_id', user.id)
                .order('start_date', { ascending: false });

            if (contributionsError) {
                console.error('Error fetching contributions:', contributionsError);
            } else {
                setContributions(contributionsData || []);
            }
        };

        fetchProfile();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        let avatarUrl = profile?.avatar_url || null;
        
        // Handle avatar removal
        if (removeAvatar) {
            avatarUrl = null;
        } else if (avatarFile) {
            // Upload new avatar if selected
            const uploadedUrl = await uploadAvatar(user.id, avatarFile);
            if (uploadedUrl) {
                avatarUrl = uploadedUrl;
            }
        }

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
                avatar_url: avatarUrl,
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
                avatar_url: avatarUrl,
                embedding,
            });
            setIsEditing(false);
            setAvatarFile(null);
            setRemoveAvatar(false);
        }
    };

    const deleteEducation = async (id: string) => {
        if (!user) return;
        
        const { error } = await supabase
            .from('educations')
            .delete()
            .eq('id', id)
            .eq('profile_id', user.id);

        if (!error) {
            setEducations(educations.filter(edu => edu.id !== id));
            // Update embeddings
            updateProfileEmbeddings();
        }
    };

    const deleteExperience = async (id: string) => {
        if (!user) return;
        
        const { error } = await supabase
            .from('experiences')
            .delete()
            .eq('id', id)
            .eq('profile_id', user.id);

        if (!error) {
            setExperiences(experiences.filter(exp => exp.id !== id));
            // Update embeddings
            updateProfileEmbeddings();
        }
    };

    const updateEducation = async (data: Partial<Education>) => {
        if (!user || !editingEducation) return;

        const { error } = await supabase
            .from('educations')
            .update({
                school: data.school,
                degree: data.degree,
                year: data.year,
            })
            .eq('id', editingEducation.id)
            .eq('profile_id', user.id);

        if (!error) {
            setEducations(educations.map(edu => 
                edu.id === editingEducation.id 
                    ? { ...edu, ...data }
                    : edu
            ));
            setEditingEducation(null);
            // Update embeddings
            updateProfileEmbeddings();
        }
    };

    const updateExperience = async (data: Partial<Experience>) => {
        if (!user || !editingExperience) return;

        const { error } = await supabase
            .from('experiences')
            .update({
                company: data.company,
                role: data.role,
                start_date: data.start_date,
                end_date: data.end_date,
                description: data.description,
            })
            .eq('id', editingExperience.id)
            .eq('profile_id', user.id);

        if (!error) {
            setExperiences(experiences.map(exp => 
                exp.id === editingExperience.id 
                    ? { ...exp, ...data }
                    : exp
            ));
            setEditingExperience(null);
            // Update embeddings
            updateProfileEmbeddings();
        }
    };

    const updateProfileEmbeddings = async () => {
        if (!user || !profile) return;

        const educationText = educations.map(edu => `${edu.degree} from ${edu.school}`).join('. ');
        const experienceText = experiences.map(exp => `${exp.role} at ${exp.company}`).join('. ');
        const skillsText = skills.map(s => s.skill).join(', ');
        
        const embeddingInput = `${profile.bio} ${skillsText} ${profile.title || ''} ${profile.location || ''} ${educationText} ${experienceText}`;
        const embedding = await getEmbedding(embeddingInput);

        await supabase
            .from('profiles')
            .update({ embedding })
            .eq('id', user.id);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', { 
            month: 'short', 
            year: 'numeric' 
        });
    };

    const formatDateRange = (startDate: string | null, endDate: string | null) => {
        if (!startDate) return '';
        const start = formatDate(startDate);
        const end = endDate ? formatDate(endDate) : 'Present';
        return `${start} - ${end}`;
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-onsurface-secondary">Loading...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-9 py-6 sm:py-8 lg:py-12">
                {/* Profile Header - Centered */}
                <div className="text-center mb-12">
                    <div className="mb-6">
                        {isEditing ? (
                            <div className="flex justify-center">
                                <ImageUploadWithCrop
                                    currentImageUrl={profile?.avatar_url}
                                    onImageSelected={(file) => {
                                        setAvatarFile(file);
                                        setRemoveAvatar(false);
                                    }}
                                    onImageRemoved={() => {
                                        setAvatarFile(null);
                                        setRemoveAvatar(true);
                                    }}
                                    label=""
                                    shape="circle"
                                />
                            </div>
                        ) : (
                            profile?.avatar_url ? (
                                <Image
                                    src={profile.avatar_url}
                                    alt={profile.name}
                                    width={120}
                                    height={120}
                                    className="rounded-full mx-auto"
                                />
                            ) : (
                                <div className="w-[120px] h-[120px] rounded-full bg-surface-container-muted flex items-center justify-center mx-auto">
                                    <User size={60} className="text-onsurface-secondary" />
                                </div>
                            )
                        )}
                    </div>
                    
                    {isEditing ? (
                        <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="text-3xl font-semibold text-center w-full border-b border-border bg-transparent focus:outline-none focus:border-primary"
                                placeholder="Your Name"
                            />
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="text-lg text-center flex-1 border-b border-border bg-transparent focus:outline-none focus:border-primary"
                                    placeholder="Title"
                                />
                                <span className="text-lg text-onsurface-secondary">in</span>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="text-lg text-center flex-1 border-b border-border bg-transparent focus:outline-none focus:border-primary"
                                    placeholder="Location"
                                />
                            </div>
                            <div className="flex gap-2 justify-center mt-4">
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary text-white dark:text-background rounded-lg hover:bg-primary-hover transition-colors"
                                >
                                    Save Changes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setAvatarFile(null);
                                        setRemoveAvatar(false);
                                    }}
                                    className="px-4 py-2 border border-border rounded-lg hover:bg-surface-container-muted transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <>
                            <h1 className="text-3xl font-semibold text-foreground mb-2">
                                {profile?.name || 'Your Name'}
                            </h1>
                            <p className="text-lg text-onsurface-secondary">
                                {profile?.title || 'Your Title'} in {profile?.location || 'Your Location'}
                            </p>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="mt-4 text-sm text-onsurface-secondary hover:text-foreground transition-colors"
                            >
                                Edit Profile
                            </button>
                        </>
                    )}
                </div>

                {/* About Section */}
                <section className="mb-12">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">About</h2>
                    {isEditing ? (
                        <textarea
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            rows={4}
                            className="w-full p-3 border border-border rounded-md bg-transparent focus:outline-none focus:border-primary"
                            placeholder="Tell us about yourself..."
                        />
                    ) : (
                        <p className="text-onsurface-primary leading-relaxed">
                            {profile?.bio || 'No bio yet'}
                        </p>
                    )}
                </section>

                {/* Skills Section */}
                {(isEditing || skills.length > 0) && (
                    <section className="mb-12">
                        <h2 className="text-xl font-semibold text-foreground mb-4">Skills</h2>
                        {isEditing ? (
                            <input
                                type="text"
                                value={formData.skills}
                                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                                className="w-full p-3 border border-border rounded-md bg-transparent focus:outline-none focus:border-primary"
                                placeholder="React, TypeScript, Node.js (comma-separated)"
                            />
                        ) : (
                            <p className="text-onsurface-primary">
                                {skills.map(s => s.skill).join(', ')}
                            </p>
                        )}
                    </section>
                )}

                {/* Social Links Section */}
                <section className="mb-12">
                    <h2 className="text-xl font-semibold text-foreground mb-4">Social Links</h2>
                    {user && (
                        <SocialLinks 
                            profileId={user.id} 
                            isEditing={isEditing}
                            onUpdate={() => {
                                // Optionally refresh profile data
                            }}
                        />
                    )}
                </section>

                {/* My Projects Section */}
                {createdProjects.length > 0 && (
                    <section className="mb-12">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-foreground">My Projects</h2>
                            <button
                                onClick={() => nextRouter.push('/projects/new')}
                                className="text-sm text-onsurface-secondary hover:text-foreground transition-colors flex items-center gap-1"
                            >
                                <Plus size={16} /> New Project
                            </button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {createdProjects.map((project) => (
                                <div
                                    key={project.id}
                                    onClick={() => nextRouter.push(`/projects/${project.id}`)}
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
                                                nextRouter.push(`/projects/${project.id}`);
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
                {contributions.length > 0 && (
                    <section className="mb-12">
                        <h2 className="text-xl font-semibold text-foreground mb-4">Contributions</h2>
                        <div className="space-y-4">
                            {contributions.map((contribution) => (
                                <div key={contribution.id} className="border-b border-border pb-4 last:border-0">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-foreground">
                                                {contribution.project?.title || 'Unknown Project'}
                                            </h3>
                                            <p className="text-sm text-onsurface-secondary">
                                                {contribution.role}
                                            </p>
                                            {contribution.project?.description && (
                                                <p className="text-sm text-onsurface-primary mt-2">
                                                    {contribution.project.description}
                                                </p>
                                            )}
                                        </div>
                                        {contribution.start_date && (
                                            <span className="text-sm text-onsurface-secondary whitespace-nowrap ml-4">
                                                {formatDateRange(contribution.start_date, contribution.end_date)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-3">
                                        <button 
                                            onClick={() => nextRouter.push(`/projects/${contribution.project?.id}`)}
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

                {/* Work Experience */}
                <section className="mb-12">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-foreground">Work Experience</h2>
                        <button
                            onClick={() => router.push('/profile/experience/new')}
                            className="text-sm text-onsurface-secondary hover:text-foreground transition-colors flex items-center gap-1"
                        >
                            <Plus size={16} /> Add Experience
                        </button>
                    </div>
                    <div className="space-y-4">
                        {experiences.map((exp) => (
                            <div key={exp.id} className="border-b border-border pb-4 last:border-0">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-medium text-foreground">
                                            {exp.role} @ {exp.company}
                                        </h3>
                                        <p className="text-sm text-onsurface-secondary">
                                            {exp.company}
                                        </p>
                                        {exp.description && (
                                            <p className="text-sm text-onsurface-primary mt-2">
                                                {exp.description}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-start gap-4 ml-4">
                                        <span className="text-sm text-onsurface-secondary whitespace-nowrap">
                                            {formatDateRange(exp.start_date, exp.end_date)}
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditingExperience(exp)}
                                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => deleteExperience(exp.id)}
                                                className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {experiences.length === 0 && (
                            <p className="text-sm text-onsurface-secondary">No experience added yet</p>
                        )}
                    </div>
                </section>

                {/* Education */}
                <section className="mb-12">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-foreground">Education</h2>
                        <button
                            onClick={() => router.push('/profile/education/new')}
                            className="text-sm text-onsurface-secondary hover:text-foreground transition-colors flex items-center gap-1"
                        >
                            <Plus size={16} /> Add Education
                        </button>
                    </div>
                    <div className="space-y-4">
                        {educations.map((edu) => (
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
                                    <div className="flex items-start gap-4 ml-4">
                                        <span className="text-sm text-onsurface-secondary whitespace-nowrap">
                                            {formatDateRange(edu.year, edu.year)}
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditingEducation(edu)}
                                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => deleteEducation(edu.id)}
                                                className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {educations.length === 0 && (
                            <p className="text-sm text-onsurface-secondary">No education added yet</p>
                        )}
                    </div>
                </section>
            </div>

            {/* Education Edit Modal */}
            <EditModal
                isOpen={!!editingEducation}
                onClose={() => setEditingEducation(null)}
                onSave={updateEducation}
                title="Edit Education"
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        updateEducation({
                            school: formData.get('school') as string,
                            degree: formData.get('degree') as string,
                            year: formData.get('year') as string,
                        });
                    }}
                    className="space-y-4"
                >
                    <div>
                        <label className="block text-sm font-medium text-onsurface-primary mb-1">
                            School
                        </label>
                        <input
                            type="text"
                            name="school"
                            defaultValue={editingEducation?.school}
                            className="w-full p-2 border border-border rounded-md bg-transparent focus:outline-none focus:border-primary"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-onsurface-primary mb-1">
                            Degree
                        </label>
                        <input
                            type="text"
                            name="degree"
                            defaultValue={editingEducation?.degree}
                            className="w-full p-2 border border-border rounded-md bg-transparent focus:outline-none focus:border-primary"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-onsurface-primary mb-1">
                            Year
                        </label>
                        <input
                            type="text"
                            name="year"
                            defaultValue={editingEducation?.year || ''}
                            className="w-full p-2 border border-border rounded-md bg-transparent focus:outline-none focus:border-primary"
                            required
                        />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button
                            type="button"
                            onClick={() => setEditingEducation(null)}
                            className="px-4 py-2 border border-border rounded-md hover:bg-surface-container-muted"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary text-white dark:text-background rounded-md hover:bg-primary-hover"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </EditModal>

            {/* Experience Edit Modal */}
            <EditModal
                isOpen={!!editingExperience}
                onClose={() => setEditingExperience(null)}
                onSave={updateExperience}
                title="Edit Experience"
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        updateExperience({
                            company: formData.get('company') as string,
                            role: formData.get('role') as string,
                            start_date: formData.get('start_date') as string,
                            end_date: formData.get('end_date') as string || null,
                            description: formData.get('description') as string || null,
                        });
                    }}
                    className="space-y-4"
                >
                    <div>
                        <label className="block text-sm font-medium text-onsurface-primary mb-1">
                            Company
                        </label>
                        <input
                            type="text"
                            name="company"
                            defaultValue={editingExperience?.company}
                            className="w-full p-2 border border-border rounded-md bg-transparent focus:outline-none focus:border-primary"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-onsurface-primary mb-1">
                            Role
                        </label>
                        <input
                            type="text"
                            name="role"
                            defaultValue={editingExperience?.role}
                            className="w-full p-2 border border-border rounded-md bg-transparent focus:outline-none focus:border-primary"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-onsurface-primary mb-1">
                                Start Date
                            </label>
                            <input
                                type="date"
                                name="start_date"
                                defaultValue={editingExperience?.start_date || ''}
                                className="w-full p-2 border border-border rounded-md bg-transparent focus:outline-none focus:border-primary"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-onsurface-primary mb-1">
                                End Date
                            </label>
                            <input
                                type="date"
                                name="end_date"
                                defaultValue={editingExperience?.end_date || ''}
                                className="w-full p-2 border border-border rounded-md bg-transparent focus:outline-none focus:border-primary"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-onsurface-primary mb-1">
                            Description
                        </label>
                        <textarea
                            name="description"
                            defaultValue={editingExperience?.description || ''}
                            rows={3}
                            className="w-full p-2 border border-border rounded-md bg-transparent focus:outline-none focus:border-primary"
                        />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button
                            type="button"
                            onClick={() => setEditingExperience(null)}
                            className="px-4 py-2 border border-border rounded-md hover:bg-surface-container-muted"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary text-white dark:text-background rounded-md hover:bg-primary-hover"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </EditModal>
        </div>
    );
}