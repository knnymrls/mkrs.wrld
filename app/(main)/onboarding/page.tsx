'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getEmbedding } from '@/lib/embeddings';

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
            // Generate embedding from bio, skills, title, and location
            const embeddingInput = `${bio} ${skills} ${title} ${location}`;
            const embedding = await getEmbedding(embeddingInput);
            
            const { error } = await supabase.from('profiles').update({
                name: name,
                bio,
                location,
                title,
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                        Complete your profile
                    </h2>
                    <div className="mt-4 flex justify-center space-x-4">
                        <div className={`px-4 py-2 rounded ${currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                            1. Basic Info
                        </div>
                        <div className={`px-4 py-2 rounded ${currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                            2. Education
                        </div>
                        <div className={`px-4 py-2 rounded ${currentStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                            3. Experience
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="rounded-md bg-red-50 dark:bg-red-900/50 p-4">
                        <div className="text-sm text-red-700 dark:text-red-200">{error}</div>
                    </div>
                )}

                {currentStep === 1 && (
                    <form className="mt-8 space-y-6" onSubmit={handleProfileSubmit}>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Name *
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    required
                                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-800"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Title *
                                </label>
                                <input
                                    id="title"
                                    type="text"
                                    required
                                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-800"
                                    placeholder="Software Engineer Intern"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Location *
                                </label>
                                <input
                                    id="location"
                                    type="text"
                                    required
                                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-800"
                                    placeholder="San Francisco, CA"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Bio *
                                </label>
                                <textarea
                                    id="bio"
                                    rows={4}
                                    required
                                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-800"
                                    placeholder="Tell us about yourself..."
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="skills" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Skills (comma separated) *
                                </label>
                                <input
                                    id="skills"
                                    type="text"
                                    required
                                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-800"
                                    placeholder="React, TypeScript, Node.js"
                                    value={skills}
                                    onChange={(e) => setSkills(e.target.value)}
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Next: Education'}
                        </button>
                    </form>
                )}

                {currentStep === 2 && (
                    <form className="mt-8 space-y-6" onSubmit={handleEducationSubmit}>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Education</h3>
                                <button
                                    type="button"
                                    onClick={addEducation}
                                    className="text-sm text-indigo-600 hover:text-indigo-500"
                                >
                                    + Add another
                                </button>
                            </div>
                            {educations.map((edu, index) => (
                                <div key={index} className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            School/University
                                        </label>
                                        <input
                                            type="text"
                                            value={edu.school}
                                            onChange={(e) => updateEducation(index, 'school', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                            placeholder="Stanford University"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Degree
                                        </label>
                                        <input
                                            type="text"
                                            value={edu.degree}
                                            onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                            placeholder="BS Computer Science"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Graduation Year
                                        </label>
                                        <input
                                            type="text"
                                            value={edu.year}
                                            onChange={(e) => updateEducation(index, 'year', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                            placeholder="2024"
                                        />
                                    </div>
                                    {educations.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeEducation(index)}
                                            className="text-sm text-red-600 hover:text-red-500"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setCurrentStep(3)}
                                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                            >
                                Skip
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Next: Experience'}
                            </button>
                        </div>
                    </form>
                )}

                {currentStep === 3 && (
                    <form className="mt-8 space-y-6" onSubmit={handleExperienceSubmit}>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Experience</h3>
                                <button
                                    type="button"
                                    onClick={addExperience}
                                    className="text-sm text-indigo-600 hover:text-indigo-500"
                                >
                                    + Add another
                                </button>
                            </div>
                            {experiences.map((exp, index) => (
                                <div key={index} className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Company
                                        </label>
                                        <input
                                            type="text"
                                            value={exp.company}
                                            onChange={(e) => updateExperience(index, 'company', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                            placeholder="Google"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Role
                                        </label>
                                        <input
                                            type="text"
                                            value={exp.role}
                                            onChange={(e) => updateExperience(index, 'role', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                            placeholder="Software Engineer Intern"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Start Date
                                            </label>
                                            <input
                                                type="text"
                                                value={exp.startDate}
                                                onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                                placeholder="June 2024"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                End Date
                                            </label>
                                            <input
                                                type="text"
                                                value={exp.endDate}
                                                onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                                placeholder="Present"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Description
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={exp.description}
                                            onChange={(e) => updateExperience(index, 'description', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                                            placeholder="Describe your responsibilities and achievements..."
                                        />
                                    </div>
                                    {experiences.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeExperience(index)}
                                            className="text-sm text-red-600 hover:text-red-500"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-4">
                            <button
                                type="submit"
                                name="skip"
                                onClick={() => {
                                    refreshProfile();
                                    router.replace('/');
                                }}
                                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                            >
                                Skip & Finish
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Complete Profile'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}