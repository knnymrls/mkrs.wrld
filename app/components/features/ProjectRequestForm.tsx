'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { TIME_COMMITMENT_LABELS, URGENCY_LABELS } from '@/app/models/ProjectRequest';

interface ProjectRequestFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    skills_needed: string[];
    time_commitment: string;
    urgency: string;
    max_participants: number;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function ProjectRequestForm({ onSubmit, onCancel }: ProjectRequestFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [timeCommitment, setTimeCommitment] = useState('few_days');
  const [urgency, setUrgency] = useState('medium');
  const [maxParticipants, setMaxParticipants] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      if (!skills.includes(skillInput.trim())) {
        setSkills([...skills, skillInput.trim()]);
      }
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || skills.length === 0) {
      alert('Please fill in all required fields and add at least one skill');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        skills_needed: skills,
        time_commitment: timeCommitment,
        urgency,
        max_participants: maxParticipants
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-surface-container rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-onsurface-primary">Post a Project Request</h2>
            <button
              onClick={onCancel}
              className="text-onsurface-secondary hover:text-onsurface-primary transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-onsurface-primary mb-2">
                Project Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., Build an AI Agent for Customer Support"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-onsurface-primary mb-2">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-32 resize-none"
                placeholder="Describe what you need help with, what the project goals are, and any specific requirements..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-onsurface-primary mb-2">
                Skills Needed * (press Enter to add)
              </label>
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., Python, Machine Learning, React"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-2"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="text-primary hover:text-primary/80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-onsurface-primary mb-2">
                  Time Commitment *
                </label>
                <select
                  value={timeCommitment}
                  onChange={(e) => setTimeCommitment(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {Object.entries(TIME_COMMITMENT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-onsurface-primary mb-2">
                  Urgency *
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {Object.entries(URGENCY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-onsurface-primary mb-2">
                Max Participants
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2 px-4 bg-primary text-white dark:text-background rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Posting...' : 'Post Project Request'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2 px-4 bg-surface-container-muted text-onsurface-primary rounded-md hover:bg-surface-container-muted/80 focus:outline-none focus:ring-2 focus:ring-surface-container-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}