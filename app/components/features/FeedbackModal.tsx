'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackType = 'bug' | 'feature' | 'improvement' | 'other';

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { user } = useAuth();
  const [type, setType] = useState<FeedbackType>('feature');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setType('feature');
      setTitle('');
      setDescription('');
      setSubmitSuccess(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          title,
          description,
          userEmail: user?.email,
          userName: user?.user_metadata?.name || 'Anonymous',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit feedback');
      }

      const data = await response.json();
      
      // Check if it was received but GitHub integration isn't fully configured
      if (data.note === 'GitHub integration not configured' || response.ok) {
        setSubmitSuccess(true);
        // Close modal after 2 seconds
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert(`Failed to submit feedback: ${error instanceof Error ? error.message : 'Unknown error'}\n\nNote: The GitHub token may need additional permissions. Please check the console for details.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const typeOptions = [
    { value: 'bug', label: '🐛 Bug Report', color: 'text-red-500' },
    { value: 'feature', label: '✨ Feature Request', color: 'text-blue-500' },
    { value: 'improvement', label: '💡 Improvement', color: 'text-yellow-500' },
    { value: 'other', label: '💬 Other', color: 'text-gray-500' },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/35 flex items-center justify-center p-4"
      style={{ zIndex: 10001 }}
      onClick={onClose}
    >
      <div
        className="bg-surface-container rounded-2xl w-full max-w-lg shadow-xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-onsurface-primary">Send Feedback</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-container-muted rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-onsurface-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {submitSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-onsurface-primary mb-2">Thank you for your feedback!</h3>
              <p className="text-sm text-onsurface-secondary">Your feedback has been submitted successfully.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-onsurface-primary mb-2">
                  Type of Feedback
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {typeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setType(option.value as FeedbackType)}
                      className={`p-3 rounded-xl border transition-all ${
                        type === option.value
                          ? 'bg-surface-container-muted border-primary'
                          : 'bg-surface-container border-border hover:bg-surface-container-muted'
                      }`}
                    >
                      <span className={`text-sm font-medium ${
                        type === option.value ? option.color : 'text-onsurface-primary'
                      }`}>
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-onsurface-primary mb-2">
                  Title *
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="Brief summary of your feedback"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-onsurface-primary mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-surface-container-muted border border-border rounded-xl text-onsurface-primary placeholder-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                  placeholder="Please provide more details..."
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 border border-border rounded-xl text-onsurface-secondary bg-surface-container hover:bg-surface-container-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim() || !description.trim()}
                  className="flex-1 py-3 px-4 border border-transparent rounded-xl text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}