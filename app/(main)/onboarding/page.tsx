'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { getEmbedding } from '@/lib/embeddings/index';
import { uploadAvatar } from '@/lib/supabase/storage';
import ImageUploadWithCrop from '../../components/ui/ImageUploadWithCrop';
import { ManualLinkedInParser } from '@/lib/linkedin/manual-parser';

export default function Onboarding() {
    const { user, refreshProfile } = useAuth();
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [linkedinUrl, setLinkedinUrl] = useState('');
    const [showLinkedInModal, setShowLinkedInModal] = useState(false);
    const [importMethod, setImportMethod] = useState<'url' | 'paste'>('url');
    const [pastedText, setPastedText] = useState('');
    const [importStatus, setImportStatus] = useState<string>('');
    
    // Profile data
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [skills, setSkills] = useState('');
    const [location, setLocation] = useState('');
    const [title, setTitle] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
    
    // Education data
    const [educations, setEducations] = useState<Array<{
        school: string;
        degree: string;
        year: string;
    }>>([{ school: '', degree: '', year: '' }]);
    
    // Cleanup preview URLs on unmount
    useEffect(() => {
        return () => {
            if (avatarPreviewUrl) {
                URL.revokeObjectURL(avatarPreviewUrl);
            }
        };
    }, [avatarPreviewUrl]);
    
    // Experience data
    const [experiences, setExperiences] = useState<Array<{
        company: string;
        role: string;
        startDate: string;
        endDate: string;
        description: string;
    }>>([{ company: '', role: '', startDate: '', endDate: '', description: '' }]);

    const handleManualPaste = () => {
        if (!pastedText.trim()) {
            setError('Please paste your LinkedIn profile content');
            return;
        }

        try {
            const parsed = ManualLinkedInParser.parseProfileText(pastedText);
            
            // Populate form fields with parsed data
            if (parsed.name) setName(parsed.name);
            if (parsed.title) setTitle(parsed.title);
            if (parsed.location) setLocation(parsed.location);
            if (parsed.about) setBio(parsed.about);
            if (parsed.skills) setSkills(parsed.skills.join(', '));
            
            if (parsed.education && parsed.education.length > 0) {
                setEducations(parsed.education.map(edu => ({
                    school: edu.school || '',
                    degree: edu.degree || '',
                    year: edu.year || ''
                })));
            }
            
            if (parsed.experience && parsed.experience.length > 0) {
                setExperiences(parsed.experience.map(exp => ({
                    company: exp.company || '',
                    role: exp.title || '',
                    startDate: exp.duration || '',
                    endDate: '',
                    description: exp.description || ''
                })));
            }
            
            setShowLinkedInModal(false);
            setPastedText('');
            setError(null);
        } catch (err) {
            setError('Failed to parse the pasted content. Please try copying different sections.');
        }
    };

    const handleLinkedInImport = async () => {
        if (!linkedinUrl.trim()) {
            setError('Please enter a LinkedIn profile URL');
            return;
        }
        
        setImporting(true);
        setError(null);
        setImportStatus('Connecting to LinkedIn...');
        
        try {
            // Add a small delay to show the initial message
            await new Promise(resolve => setTimeout(resolve, 500));
            setImportStatus('Fetching your profile data...');
            
            const response = await fetch('/api/linkedin/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ linkedinUrl }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                // Handle setup instructions
                if (response.status === 503 && data.setupInstructions) {
                    const instructions = Object.values(data.setupInstructions).join('\n');
                    setError(`Setup Required:\n${instructions}\n\nFor now, please use the Copy & Paste method.`);
                    setImportMethod('paste');
                    return;
                }
                // Handle fallback to paste method
                if (data.fallbackMethod === 'paste') {
                    setError(data.error);
                    setImportMethod('paste');
                    return;
                }
                throw new Error(data.error || 'Failed to import LinkedIn profile');
            }
            
            // Populate form fields with imported data
            if (data.profile) {
                setImportStatus('Populating your information...');
                await new Promise(resolve => setTimeout(resolve, 300));
                
                setName(data.profile.name || '');
                setTitle(data.profile.title || '');
                setLocation(data.profile.location || '');
                setBio(data.profile.bio || '');
                setSkills(data.profile.skills || '');
                
                if (data.profile.education && data.profile.education.length > 0) {
                    setEducations(data.profile.education.map((edu: any) => ({
                        school: edu.school || '',
                        degree: edu.degree || '',
                        year: edu.endYear || ''
                    })));
                }
                
                if (data.profile.experience && data.profile.experience.length > 0) {
                    setExperiences(data.profile.experience);
                }
                
                // Handle profile picture
                if (data.profile.profilePicture) {
                    try {
                        setImportStatus('Downloading profile picture...');
                        // Download the image from the URL
                        const imageResponse = await fetch(data.profile.profilePicture);
                        const blob = await imageResponse.blob();
                        const file = new File([blob], 'profile-picture.jpg', { type: blob.type });
                        setAvatarFile(file);
                        // Create a preview URL for the image
                        const previewUrl = URL.createObjectURL(blob);
                        setAvatarPreviewUrl(previewUrl);
                    } catch (err) {
                        console.error('Failed to download profile picture:', err);
                    }
                }
                
                setImportStatus('Import complete!');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            setShowLinkedInModal(false);
            setLinkedinUrl('');
            setImportStatus('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to import LinkedIn profile');
            setImportStatus('');
        } finally {
            setImporting(false);
        }
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        
        if (!user) {
            setError('User not found.');
            setLoading(false);
            return;
        }
        
        try {
            let avatarUrl = null;
            
            // Upload avatar if selected
            if (avatarFile) {
                avatarUrl = await uploadAvatar(user.id, avatarFile);
            }
            
            // Generate embedding from bio, skills, title, and location
            const embeddingInput = `${bio} ${skills} ${title} ${location}`;
            const embedding = await getEmbedding(embeddingInput);
            
            const { error } = await supabase.from('profiles').update({
                name: name,
                bio,
                location,
                title,
                avatar_url: avatarUrl,
                embedding,
            }).eq('id', user.id);
            
            if (error) throw error;
            
            // Insert skills into skills table
            const skillsList = skills.split(',').map((s) => s.trim()).filter(s => s);
            if (skillsList.length > 0) {
                const { error: skillsError } = await supabase.from('skills').insert(
                    skillsList.map(skill => ({
                        profile_id: user.id,
                        skill
                    }))
                );
                if (skillsError) throw skillsError;
            }
            
            setCurrentStep(2);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleEducationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        
        if (!user) {
            setError('User not found.');
            setLoading(false);
            return;
        }
        
        try {
            // Filter out empty educations
            const validEducations = educations.filter(edu => edu.school && edu.degree);
            
            if (validEducations.length > 0) {
                const { error } = await supabase.from('educations').insert(
                    validEducations.map(edu => ({
                        profile_id: user.id,
                        school: edu.school,
                        degree: edu.degree,
                        year: edu.year || null,
                    }))
                );
                
                if (error) throw error;
            }
            
            setCurrentStep(3);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleExperienceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        
        if (!user) {
            setError('User not found.');
            setLoading(false);
            return;
        }
        
        try {
            // Filter out empty experiences
            const validExperiences = experiences.filter(exp => exp.company && exp.role);
            
            if (validExperiences.length > 0) {
                const { error } = await supabase.from('experiences').insert(
                    validExperiences.map(exp => ({
                        profile_id: user.id,
                        company: exp.company,
                        role: exp.role,
                        start_date: exp.startDate || null,
                        end_date: exp.endDate || null,
                        description: exp.description || null,
                    }))
                );
                
                if (error) throw error;
            }
            
            // Update profile embedding with all the data
            const educationText = educations
                .filter(edu => edu.school && edu.degree)
                .map(edu => `${edu.degree} from ${edu.school}`)
                .join('. ');
            const experienceText = validExperiences
                .map(exp => `${exp.role} at ${exp.company}`)
                .join('. ');
            
            const embeddingInput = `${bio} ${skills} ${title} ${location} ${educationText} ${experienceText}`;
            const embedding = await getEmbedding(embeddingInput);
            
            // Update the profile with the new embedding
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ embedding })
                .eq('id', user.id);
                
            if (updateError) throw updateError;
            
            await refreshProfile();
            router.replace('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const addEducation = () => {
        setEducations([...educations, { school: '', degree: '', year: '' }]);
    };

    const removeEducation = (index: number) => {
        setEducations(educations.filter((_, i) => i !== index));
    };

    const updateEducation = (index: number, field: string, value: string) => {
        const updated = [...educations];
        updated[index] = { ...updated[index], [field]: value };
        setEducations(updated);
    };

    const addExperience = () => {
        setExperiences([...experiences, { company: '', role: '', startDate: '', endDate: '', description: '' }]);
    };

    const removeExperience = (index: number) => {
        setExperiences(experiences.filter((_, i) => i !== index));
    };

    const updateExperience = (index: number, field: string, value: string) => {
        const updated = [...experiences];
        updated[index] = { ...updated[index], [field]: value };
        setExperiences(updated);
    };

    return (
        <div className="min-h-screen bg-background px-4 sm:px-6 lg:px-9 py-8 sm:py-12">
            <div className="w-full max-w-2xl mx-auto">
                <div className="text-center mb-6 sm:mb-8">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-onsurface-primary mb-2 sm:mb-3">
                        Let's build your profile
                    </h2>
                    <p className="text-onsurface-secondary text-base sm:text-lg px-4 sm:px-0">
                        Help your team discover your expertise and connect with you
                    </p>
                </div>
                
                {/* Progress Steps - Scrollable on mobile */}
                <div className="mb-8 sm:mb-12 overflow-x-auto">
                    <div className="flex justify-center items-center min-w-fit px-4 sm:px-0">
                        <div className="flex items-center gap-2 sm:gap-4">
                            <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-2xl transition-all whitespace-nowrap ${
                                currentStep >= 1 
                                    ? 'bg-primary text-white shadow-lg' 
                                    : 'bg-surface-container-muted text-onsurface-secondary border border-border'
                            }`}>
                                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                                    currentStep >= 1 ? 'bg-white text-primary' : 'bg-surface-container text-onsurface-secondary'
                                }`}>
                                    1
                                </div>
                                <span className="font-medium text-sm sm:text-base">Basic Info</span>
                            </div>
                            
                            <div className={`w-4 sm:w-8 h-0.5 transition-colors ${
                                currentStep >= 2 ? 'bg-primary' : 'bg-border'
                            }`} />
                            
                            <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-2xl transition-all whitespace-nowrap ${
                                currentStep >= 2 
                                    ? 'bg-primary text-white shadow-lg' 
                                    : 'bg-surface-container-muted text-onsurface-secondary border border-border'
                            }`}>
                                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                                    currentStep >= 2 ? 'bg-white text-primary' : 'bg-surface-container text-onsurface-secondary'
                                }`}>
                                    2
                                </div>
                                <span className="font-medium text-sm sm:text-base">Education</span>
                            </div>
                            
                            <div className={`w-4 sm:w-8 h-0.5 transition-colors ${
                                currentStep >= 3 ? 'bg-primary' : 'bg-border'
                            }`} />
                            
                            <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-2xl transition-all whitespace-nowrap ${
                                currentStep >= 3 
                                    ? 'bg-primary text-white shadow-lg' 
                                    : 'bg-surface-container-muted text-onsurface-secondary border border-border'
                            }`}>
                                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                                    currentStep >= 3 ? 'bg-white text-primary' : 'bg-surface-container text-onsurface-secondary'
                                }`}>
                                    3
                                </div>
                                <span className="font-medium text-sm sm:text-base">Experience</span>
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-sm text-red-700 dark:text-red-400">{error}</div>
                        </div>
                    </div>
                )}

                {currentStep === 1 && (
                    <div className="bg-surface-container rounded-2xl border border-border shadow-lg p-4 sm:p-6 lg:p-8">
                        {/* LinkedIn Import Button */}
                        <div className="mb-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-center sm:text-left">
                                    <h3 className="text-base font-medium text-onsurface-primary mb-1">Import from LinkedIn</h3>
                                    <p className="text-sm text-onsurface-secondary">Save time by importing your profile</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowLinkedInModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-all"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                                    </svg>
                                    Import from LinkedIn
                                </button>
                            </div>
                        </div>
                        
                        <form className="space-y-5 sm:space-y-6" onSubmit={handleProfileSubmit}>
                            <div className="space-y-5 sm:space-y-6">
                                <div className="flex justify-center mb-6 sm:mb-8">
                                    <div className="text-center">
                                        <ImageUploadWithCrop
                                            currentImageUrl={avatarPreviewUrl}
                                            onImageSelected={(file) => {
                                                setAvatarFile(file);
                                                if (file) {
                                                    const url = URL.createObjectURL(file);
                                                    setAvatarPreviewUrl(url);
                                                }
                                            }}
                                            onImageRemoved={() => {
                                                setAvatarFile(null);
                                                setAvatarPreviewUrl(null);
                                            }}
                                            label="Upload Avatar"
                                            shape="circle"
                                        />
                                        <p className="text-xs sm:text-sm text-onsurface-secondary mt-2 sm:mt-3">Add a photo to help your team recognize you</p>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-onsurface-primary mb-2">
                                        Full Name *
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        required
                                        className="w-full min-h-[48px] px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                        placeholder="e.g. John Doe"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="title" className="block text-sm font-medium text-onsurface-primary mb-2">
                                        Job Title *
                                    </label>
                                    <input
                                        id="title"
                                        type="text"
                                        required
                                        className="w-full min-h-[48px] px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                        placeholder="e.g. Software Engineer, Product Manager, Designer"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="location" className="block text-sm font-medium text-onsurface-primary mb-2">
                                        Location *
                                    </label>
                                    <input
                                        id="location"
                                        type="text"
                                        required
                                        className="w-full min-h-[48px] px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                        placeholder="e.g. San Francisco, CA or Remote"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="bio" className="block text-sm font-medium text-onsurface-primary mb-2">
                                        About You *
                                    </label>
                                    <textarea
                                        id="bio"
                                        rows={4}
                                        required
                                        className="w-full min-h-[120px] px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                                        placeholder="Tell your team about your background, interests, and what you're passionate about..."
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                    />
                                    <p className="text-xs text-onsurface-secondary mt-1 sm:mt-2">This helps your team understand your background and expertise</p>
                                </div>

                                <div>
                                    <label htmlFor="skills" className="block text-sm font-medium text-onsurface-primary mb-2">
                                        Skills & Technologies *
                                    </label>
                                    <input
                                        id="skills"
                                        type="text"
                                        required
                                        className="w-full min-h-[48px] px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                        placeholder="e.g. React, TypeScript, Python, Figma, Project Management"
                                        value={skills}
                                        onChange={(e) => setSkills(e.target.value)}
                                    />
                                    <p className="text-xs text-onsurface-secondary mt-1 sm:mt-2">Separate multiple skills with commas</p>
                                </div>
                            </div>
                            
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full min-h-[48px] flex justify-center items-center gap-2 py-3 sm:py-4 px-6 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg text-base sm:text-sm"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Continue to Education</span>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="bg-surface-container rounded-2xl border border-border shadow-lg p-4 sm:p-6 lg:p-8">
                        <div className="text-center mb-4 sm:mb-6">
                            <h3 className="text-xl sm:text-2xl font-medium text-onsurface-primary mb-2">Education Background</h3>
                            <p className="text-sm sm:text-base text-onsurface-secondary px-4 sm:px-0">Add your educational background (optional, but helps with matching)</p>
                        </div>
                        <form className="space-y-5 sm:space-y-6" onSubmit={handleEducationSubmit}>
                            <div className="space-y-5 sm:space-y-6">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                    <h4 className="text-base sm:text-lg font-medium text-onsurface-primary">Educational Background</h4>
                                    <button
                                        type="button"
                                        onClick={addEducation}
                                        className="flex items-center justify-center gap-1 text-sm text-primary hover:text-primary-hover font-medium transition-colors min-h-[40px] px-3 py-2 rounded-lg hover:bg-surface-container-muted"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add Another
                                    </button>
                                </div>

                                {educations.map((edu, index) => (
                                    <div key={index} className="bg-surface-container-muted border border-border rounded-xl p-4 sm:p-6 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-onsurface-primary mb-2">
                                                School/University
                                            </label>
                                            <input
                                                type="text"
                                                value={edu.school}
                                                onChange={(e) => updateEducation(index, 'school', e.target.value)}
                                                className="w-full min-h-[48px] px-4 py-3 bg-surface-container border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                                placeholder="e.g. Stanford University, MIT, UC Berkeley"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-onsurface-primary mb-2">
                                                Degree
                                            </label>
                                            <input
                                                type="text"
                                                value={edu.degree}
                                                onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                                                className="w-full min-h-[48px] px-4 py-3 bg-surface-container border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                                placeholder="e.g. BS Computer Science, MBA, MS Design"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-onsurface-primary mb-2">
                                                Graduation Year
                                            </label>
                                            <input
                                                type="text"
                                                value={edu.year}
                                                onChange={(e) => updateEducation(index, 'year', e.target.value)}
                                                className="w-full min-h-[48px] px-4 py-3 bg-surface-container border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                                placeholder="e.g. 2024 or Expected 2025"
                                            />
                                        </div>

                                        {educations.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeEducation(index)}
                                                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 transition-colors min-h-[40px] px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(3)}
                                    className="w-full sm:flex-1 min-h-[48px] py-3 px-6 border border-border rounded-xl text-base sm:text-sm font-medium text-onsurface-secondary bg-surface-container-muted hover:bg-surface-container transition-all"
                                >
                                    Skip for Now
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full sm:flex-1 min-h-[48px] flex justify-center items-center gap-2 py-3 px-6 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 text-base sm:text-sm"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Continue to Experience</span>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="bg-surface-container rounded-2xl border border-border shadow-lg p-4 sm:p-6 lg:p-8">
                        <div className="text-center mb-4 sm:mb-6">
                            <h3 className="text-xl sm:text-2xl font-medium text-onsurface-primary mb-2">Work Experience</h3>
                            <p className="text-sm sm:text-base text-onsurface-secondary px-4 sm:px-0">Share your professional background to help colleagues understand your expertise</p>
                        </div>
                        <form className="space-y-5 sm:space-y-6" onSubmit={handleExperienceSubmit}>
                            <div className="space-y-5 sm:space-y-6">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                    <h4 className="text-base sm:text-lg font-medium text-onsurface-primary">Professional Experience</h4>
                                    <button
                                        type="button"
                                        onClick={addExperience}
                                        className="flex items-center justify-center gap-1 text-sm text-primary hover:text-primary-hover font-medium transition-colors min-h-[40px] px-3 py-2 rounded-lg hover:bg-surface-container-muted"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add Another
                                    </button>
                                </div>

                                {experiences.map((exp, index) => (
                                    <div key={index} className="bg-surface-container-muted border border-border rounded-xl p-4 sm:p-6 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-onsurface-primary mb-2">
                                                Company
                                            </label>
                                            <input
                                                type="text"
                                                value={exp.company}
                                                onChange={(e) => updateExperience(index, 'company', e.target.value)}
                                                className="w-full min-h-[48px] px-4 py-3 bg-surface-container border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                                placeholder="e.g. Google, Microsoft, Startup Inc."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-onsurface-primary mb-2">
                                                Role/Position
                                            </label>
                                            <input
                                                type="text"
                                                value={exp.role}
                                                onChange={(e) => updateExperience(index, 'role', e.target.value)}
                                                className="w-full min-h-[48px] px-4 py-3 bg-surface-container border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                                placeholder="e.g. Software Engineer, Product Manager, Design Lead"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-onsurface-primary mb-2">
                                                    Start Date
                                                </label>
                                                <input
                                                    type="text"
                                                    value={exp.startDate}
                                                    onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                                                    className="w-full min-h-[48px] px-4 py-3 bg-surface-container border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                                    placeholder="e.g. June 2024"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-onsurface-primary mb-2">
                                                    End Date
                                                </label>
                                                <input
                                                    type="text"
                                                    value={exp.endDate}
                                                    onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                                                    className="w-full min-h-[48px] px-4 py-3 bg-surface-container border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                                    placeholder="Present or Aug 2024"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-onsurface-primary mb-2">
                                                Description
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={exp.description}
                                                onChange={(e) => updateExperience(index, 'description', e.target.value)}
                                                className="w-full min-h-[96px] px-4 py-3 bg-surface-container border border-border rounded-xl text-base sm:text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                                                placeholder="Describe your key responsibilities, achievements, and technologies used..."
                                            />
                                        </div>

                                        {experiences.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeExperience(index)}
                                                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 transition-colors min-h-[40px] px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        refreshProfile();
                                        router.replace('/');
                                    }}
                                    className="w-full sm:flex-1 min-h-[48px] py-3 px-6 border border-border rounded-xl text-base sm:text-sm font-medium text-onsurface-secondary bg-surface-container-muted hover:bg-surface-container transition-all"
                                >
                                    Skip & Finish
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full sm:flex-1 min-h-[48px] flex justify-center items-center gap-2 py-3 px-6 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg text-base sm:text-sm"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            <span>Completing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span>Complete Profile</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* LinkedIn Import Modal */}
                {showLinkedInModal && (
                    <div className="fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm" style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)' }}>
                        <div className="bg-surface-container rounded-3xl shadow-lg p-6 w-full max-w-lg relative">
                            {/* Loading overlay */}
                            {importing && (
                                <div className="absolute inset-0 bg-surface-container bg-opacity-95 rounded-3xl flex flex-col items-center justify-center z-10">
                                    <div className="flex flex-col items-center gap-4">
                                        {/* Animated LinkedIn logo or spinner */}
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-full bg-primary bg-opacity-20 animate-ping absolute" />
                                            <div className="w-16 h-16 rounded-full bg-primary bg-opacity-30 animate-ping absolute" style={{ animationDelay: '200ms' }} />
                                            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center relative">
                                                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                                                </svg>
                                            </div>
                                        </div>
                                        
                                        {/* Status message */}
                                        <div className="text-center">
                                            <p className="text-lg font-medium text-onsurface-primary mb-2">
                                                {importStatus || 'Starting import...'}
                                            </p>
                                            <p className="text-sm text-onsurface-secondary">
                                                This may take up to 30 seconds
                                            </p>
                                        </div>
                                        
                                        {/* Progress dots */}
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <h3 className="text-xl font-medium text-onsurface-primary mb-4">Import LinkedIn Profile</h3>
                            
                            {/* Import method tabs */}
                            <div className="flex gap-2 mb-6">
                                <button
                                    type="button"
                                    onClick={() => setImportMethod('url')}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                                        importMethod === 'url' 
                                            ? 'bg-primary text-white' 
                                            : 'bg-surface-container-muted text-onsurface-secondary hover:bg-surface-container'
                                    }`}
                                >
                                    Import from URL
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImportMethod('paste')}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                                        importMethod === 'paste' 
                                            ? 'bg-primary text-white' 
                                            : 'bg-surface-container-muted text-onsurface-secondary hover:bg-surface-container'
                                    }`}
                                >
                                    Copy & Paste
                                </button>
                            </div>
                            
                            {importMethod === 'url' ? (
                                <>
                                    <p className="text-sm text-onsurface-secondary mb-4">
                                        Enter your LinkedIn profile URL to import your information
                                    </p>
                                    <input
                                        type="url"
                                        value={linkedinUrl}
                                        onChange={(e) => setLinkedinUrl(e.target.value)}
                                        placeholder="https://www.linkedin.com/in/yourprofile"
                                        className="w-full px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all mb-6"
                                    />
                                </>
                            ) : (
                                <>
                                    <p className="text-sm text-onsurface-secondary mb-2">
                                        Copy your LinkedIn profile information and paste it below
                                    </p>
                                    <ol className="text-xs text-onsurface-secondary mb-4 space-y-1">
                                        <li>1. Go to your LinkedIn profile</li>
                                        <li>2. Select and copy your profile sections (name, about, experience, etc.)</li>
                                        <li>3. Paste the content below</li>
                                    </ol>
                                    <textarea
                                        value={pastedText}
                                        onChange={(e) => setPastedText(e.target.value)}
                                        placeholder="Paste your LinkedIn profile content here..."
                                        className="w-full px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-sm text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all mb-6 min-h-[200px] resize-y"
                                    />
                                </>
                            )}
                            
                            {error && (
                                <div className="rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-3 mb-4">
                                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                                </div>
                            )}
                            
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowLinkedInModal(false);
                                        setLinkedinUrl('');
                                        setPastedText('');
                                        setError(null);
                                        setImportMethod('url');
                                        setImportStatus('');
                                    }}
                                    className="flex-1 py-3 px-4 border border-border rounded-xl text-sm font-medium text-onsurface-secondary bg-surface-container-muted hover:bg-surface-container transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={importMethod === 'url' ? handleLinkedInImport : handleManualPaste}
                                    disabled={importing}
                                    className="flex-1 flex justify-center items-center gap-2 py-3 px-4 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-all disabled:opacity-50"
                                >
                                    {importing ? (
                                        <>
                                            <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            <span>Importing...</span>
                                        </>
                                    ) : (
                                        <span>{importMethod === 'url' ? 'Import Profile' : 'Parse & Import'}</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}