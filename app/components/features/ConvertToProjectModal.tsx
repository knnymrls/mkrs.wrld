'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { ProjectRequest, ProjectInterest } from '@/app/models/ProjectRequest';

interface ConvertToProjectModalProps {
  request: ProjectRequest;
  selectedInterests: ProjectInterest[];
  onConfirm: (projectData: {
    title: string;
    description: string;
    status: string;
    contributors: { user_id: string; role: string }[];
  }) => Promise<void>;
  onClose: () => void;
}

export default function ConvertToProjectModal({ 
  request, 
  selectedInterests, 
  onConfirm, 
  onClose 
}: ConvertToProjectModalProps) {
  const [title, setTitle] = useState(request.title);
  const [description, setDescription] = useState(request.description);
  const [status, setStatus] = useState('active');
  const [contributors, setContributors] = useState(
    selectedInterests.map(interest => ({
      user_id: interest.interested_user_id,
      name: interest.interested_user?.name || '',
      role: ''
    }))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleChange = (userId: string, role: string) => {
    setContributors(contributors.map(c => 
      c.user_id === userId ? { ...c, role } : c
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const contributorsWithRoles = contributors.filter(c => c.role.trim());
    if (contributorsWithRoles.length === 0) {
      alert('Please assign roles to at least one contributor');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        title: title.trim(),
        description: description.trim(),
        status,
        contributors: contributorsWithRoles.map(c => ({
          user_id: c.user_id,
          role: c.role
        }))
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Convert to Project</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="planning">Planning</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign Roles to Contributors
              </label>
              <div className="space-y-3">
                {contributors.map((contributor) => (
                  <div key={contributor.user_id} className="flex items-center gap-3">
                    <span className="flex-1 text-gray-700">{contributor.name}</span>
                    <input
                      type="text"
                      value={contributor.role}
                      onChange={(e) => handleRoleChange(contributor.user_id, e.target.value)}
                      placeholder="e.g., Lead Developer, Designer"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Only contributors with assigned roles will be added to the project
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Creating Project...' : 'Create Project'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
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