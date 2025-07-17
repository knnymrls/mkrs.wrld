'use client';

import React from 'react';
import { Search, Filter } from 'lucide-react';
import { TIME_COMMITMENT_LABELS, URGENCY_LABELS } from '@/app/models/ProjectRequest';

interface ProjectFiltersProps {
  filters: {
    search: string;
    skills: string[];
    timeCommitment: string;
    urgency: string;
    department: string;
    division: string;
  };
  onFilterChange: (filters: any) => void;
  availableSkills?: string[];
  availableDepartments?: string[];
  availableDivisions?: string[];
}

export default function ProjectFilters({ 
  filters, 
  onFilterChange,
  availableSkills = [],
  availableDepartments = [],
  availableDivisions = []
}: ProjectFiltersProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, search: e.target.value });
  };

  const handleSkillToggle = (skill: string) => {
    const newSkills = filters.skills.includes(skill)
      ? filters.skills.filter(s => s !== skill)
      : [...filters.skills, skill];
    onFilterChange({ ...filters, skills: newSkills });
  };

  const clearFilters = () => {
    onFilterChange({
      search: '',
      skills: [],
      timeCommitment: '',
      urgency: '',
      department: '',
      division: ''
    });
  };

  const hasActiveFilters = filters.search || filters.skills.length > 0 || 
    filters.timeCommitment || filters.urgency || filters.department || filters.division;

  return (
    <div className="bg-surface-container rounded-lg shadow-sm border border-border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-onsurface-primary flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filters
        </h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-onsurface-primary mb-2">Search</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-onsurface-secondary w-4 h-4" />
          <input
            type="text"
            value={filters.search}
            onChange={handleSearchChange}
            placeholder="Search project requests..."
            className="w-full pl-10 pr-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {availableSkills.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-onsurface-primary mb-2">Skills</label>
          <div className="flex flex-wrap gap-2">
            {availableSkills.slice(0, 10).map(skill => (
              <button
                key={skill}
                onClick={() => handleSkillToggle(skill)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  filters.skills.includes(skill)
                    ? 'bg-primary text-onprimary'
                    : 'bg-surface-container-muted text-onsurface-primary hover:bg-surface-container-muted/80'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-onsurface-primary mb-2">Time Commitment</label>
        <select
          value={filters.timeCommitment}
          onChange={(e) => onFilterChange({ ...filters, timeCommitment: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Any</option>
          {Object.entries(TIME_COMMITMENT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-onsurface-primary mb-2">Urgency</label>
        <select
          value={filters.urgency}
          onChange={(e) => onFilterChange({ ...filters, urgency: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Any</option>
          {Object.entries(URGENCY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {availableDepartments.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-onsurface-primary mb-2">Department</label>
          <select
            value={filters.department}
            onChange={(e) => onFilterChange({ ...filters, department: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Any</option>
            {availableDepartments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      )}

      {availableDivisions.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-onsurface-primary mb-2">Division</label>
          <select
            value={filters.division}
            onChange={(e) => onFilterChange({ ...filters, division: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Any</option>
            {availableDivisions.map(div => (
              <option key={div} value={div}>{div}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}