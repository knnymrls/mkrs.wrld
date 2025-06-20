'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { getEmbedding } from '@/lib/embeddings/index';
import { uploadAvatar } from '@/lib/supabase/storage';
import ImageUploadWithCrop from '../../components/ui/ImageUploadWithCrop';

export default function Onboarding() {
    const { user, refreshProfile } = useAuth();
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    
    // Profile data
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [skills, setSkills] = useState('');
    const [location, setLocation] = useState('');
    const [title, setTitle] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    
    // Education data
    const [educations, setEducations] = useState<Array<{
        school: string;
        degree: string;
        year: string;
    }>>([{ school: '', degree: '', year: '' }]);
    
    // Experience data
    const [experiences, setExperiences] = useState<Array<{
        company: string;
        role: string;
        startDate: string;
        endDate: string;
        description: string;
    }>>([{ company: '', role: '', startDate: '', endDate: '', description: '' }]);

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
        <div className="min-h-screen bg-background px-9 py-12">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h2 className="text-4xl font-medium text-onsurface-primary mb-3">
                        Let's build your profile
                    </h2>
                    <p className="text-onsurface-secondary text-lg">
                        Help your team discover your expertise and connect with you
                    </p>
                </div>
                
                {/* Progress Steps */}
                <div className="flex justify-center items-center mb-12">
                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                            currentStep >= 1 
                                ? 'bg-primary text-white shadow-lg' 
                                : 'bg-surface-container-muted text-onsurface-secondary border border-border'
                        }`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                                currentStep >= 1 ? 'bg-white text-primary' : 'bg-surface-container text-onsurface-secondary'
                            }`}>
                                1
                            </div>
                            <span className="font-medium">Basic Info</span>
                        </div>
                        
                        <div className={`w-8 h-0.5 transition-colors ${
                            currentStep >= 2 ? 'bg-primary' : 'bg-border'
                        }`} />
                        
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                            currentStep >= 2 
                                ? 'bg-primary text-white shadow-lg' 
                                : 'bg-surface-container-muted text-onsurface-secondary border border-border'
                        }`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                                currentStep >= 2 ? 'bg-white text-primary' : 'bg-surface-container text-onsurface-secondary'
                            }`}>
                                2
                            </div>
                            <span className="font-medium">Education</span>
                        </div>
                        
                        <div className={`w-8 h-0.5 transition-colors ${
                            currentStep >= 3 ? 'bg-primary' : 'bg-border'
                        }`} />
                        
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                            currentStep >= 3 
                                ? 'bg-primary text-white shadow-lg' 
                                : 'bg-surface-container-muted text-onsurface-secondary border border-border'
                        }`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                                currentStep >= 3 ? 'bg-white text-primary' : 'bg-surface-container text-onsurface-secondary'
                            }`}>
                                3
                            </div>
                            <span className="font-medium">Experience</span>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</div>
                        </div>
                    </div>
                )}

                {currentStep === 1 && (
                    <div className="bg-surface-container rounded-2xl border border-border shadow-lg p-8">
                        <form className="space-y-6" onSubmit={handleProfileSubmit}>
                            <div className="space-y-6">
                                <div className="flex justify-center mb-8">
                                    <div className="text-center">
                                        <ImageUploadWithCrop
                                            currentImageUrl={null}
                                            onImageSelected={setAvatarFile}
                                            onImageRemoved={() => setAvatarFile(null)}
                                            label="Upload Avatar"
                                            shape="circle"
                                        />
                                        <p className="text-sm text-onsurface-secondary mt-3">Add a photo to help your team recognize you</p>
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
                                        className="w-full px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
                                        className="w-full px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
                                        className="w-full px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
                                        className="w-full px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                                        placeholder="Tell your team about your background, interests, and what you're passionate about..."
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                    />
                                    <p className="text-xs text-onsurface-secondary mt-2">This helps your team understand your background and expertise</p>
                                </div>

                                <div>
                                    <label htmlFor="skills" className="block text-sm font-medium text-onsurface-primary mb-2">
                                        Skills & Technologies *
                                    </label>
                                    <input
                                        id="skills"
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                        placeholder="e.g. React, TypeScript, Python, Figma, Project Management"
                                        value={skills}
                                        onChange={(e) => setSkills(e.target.value)}
                                    />
                                    <p className="text-xs text-onsurface-secondary mt-2">Separate multiple skills with commas</p>
                                </div>
                            </div>
                            
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center gap-2 py-4 px-6 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
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
                    <div className="bg-surface-container rounded-2xl border border-border shadow-lg p-8">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-medium text-onsurface-primary mb-2">Education Background</h3>
                            <p className="text-onsurface-secondary">Add your educational background (optional, but helps with matching)</p>
                        </div>
                        <form className="space-y-6" onSubmit={handleEducationSubmit}>
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-lg font-medium text-onsurface-primary">Educational Background</h4>
                                    <button
                                        type="button"
                                        onClick={addEducation}
                                        className="flex items-center gap-1 text-sm text-primary hover:text-primary-hover font-medium transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add Another
                                    </button>
                                </div>

                                {educations.map((edu, index) => (
                                    <div key={index} className="bg-surface-container-muted border border-border rounded-xl p-6 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-onsurface-primary mb-2">
                                                School/University
                                            </label>
                                            <input
                                                type="text"
                                                value={edu.school}
                                                onChange={(e) => updateEducation(index, 'school', e.target.value)}
                                                className="w-full px-4 py-3 bg-surface-container border border-border rounded-xl text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
                                                className="w-full px-4 py-3 bg-surface-container border border-border rounded-xl text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
                                                className="w-full px-4 py-3 bg-surface-container border border-border rounded-xl text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                                placeholder="e.g. 2024 or Expected 2025"
                                            />
                                        </div>

                                        {educations.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeEducation(index)}
                                                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 transition-colors"
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
                            
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(3)}
                                    className="flex-1 py-3 px-6 border border-border rounded-xl text-sm font-medium text-onsurface-secondary bg-surface-container-muted hover:bg-surface-container transition-all"
                                >
                                    Skip for Now
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 flex justify-center items-center gap-2 py-3 px-6 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
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
                    <div className="bg-surface-container rounded-2xl border border-border shadow-lg p-8">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-medium text-onsurface-primary mb-2">Work Experience</h3>
                            <p className="text-onsurface-secondary">Share your professional background to help colleagues understand your expertise</p>
                        </div>
                        <form className="space-y-6" onSubmit={handleExperienceSubmit}>
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-lg font-medium text-onsurface-primary">Professional Experience</h4>
                                    <button
                                        type="button"
                                        onClick={addExperience}
                                        className="flex items-center gap-1 text-sm text-primary hover:text-primary-hover font-medium transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add Another
                                    </button>
                                </div>

                                {experiences.map((exp, index) => (
                                    <div key={index} className="bg-surface-container-muted border border-border rounded-xl p-6 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-onsurface-primary mb-2">
                                                Company
                                            </label>
                                            <input
                                                type="text"
                                                value={exp.company}
                                                onChange={(e) => updateExperience(index, 'company', e.target.value)}
                                                className="w-full px-4 py-3 bg-surface-container border border-border rounded-xl text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
                                                className="w-full px-4 py-3 bg-surface-container border border-border rounded-xl text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                                placeholder="e.g. Software Engineer, Product Manager, Design Lead"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-onsurface-primary mb-2">
                                                    Start Date
                                                </label>
                                                <input
                                                    type="text"
                                                    value={exp.startDate}
                                                    onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                                                    className="w-full px-4 py-3 bg-surface-container border border-border rounded-xl text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
                                                    className="w-full px-4 py-3 bg-surface-container border border-border rounded-xl text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
                                                className="w-full px-4 py-3 bg-surface-container border border-border rounded-xl text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                                                placeholder="Describe your key responsibilities, achievements, and technologies used..."
                                            />
                                        </div>

                                        {experiences.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeExperience(index)}
                                                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 transition-colors"
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
                            
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        refreshProfile();
                                        router.replace('/');
                                    }}
                                    className="flex-1 py-3 px-6 border border-border rounded-xl text-sm font-medium text-onsurface-secondary bg-surface-container-muted hover:bg-surface-container transition-all"
                                >
                                    Skip & Finish
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 flex justify-center items-center gap-2 py-3 px-6 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
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
            </div>
        </div>
    );
}