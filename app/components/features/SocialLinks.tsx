'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Link } from '../../models/Link';
import { 
  Linkedin, 
  Instagram, 
  Twitter, 
  Github, 
  Globe, 
  Plus, 
  X, 
  ExternalLink 
} from 'lucide-react';

interface SocialLinksProps {
  profileId: string;
  isEditing?: boolean;
  onUpdate?: () => void;
}

interface PlatformConfig {
  icon: any; // Using any to avoid TypeScript issues with Lucide icons
  label: string;
  placeholder: string;
  baseUrl?: string;
}

const PLATFORMS: Record<string, PlatformConfig> = {
  linkedin: {
    icon: Linkedin,
    label: 'LinkedIn',
    placeholder: 'https://linkedin.com/in/username',
    baseUrl: 'https://linkedin.com/in/'
  },
  instagram: {
    icon: Instagram,
    label: 'Instagram',
    placeholder: 'https://instagram.com/username',
    baseUrl: 'https://instagram.com/'
  },
  twitter: {
    icon: Twitter,
    label: 'Twitter/X',
    placeholder: 'https://twitter.com/username',
    baseUrl: 'https://twitter.com/'
  },
  github: {
    icon: Github,
    label: 'GitHub',
    placeholder: 'https://github.com/username',
    baseUrl: 'https://github.com/'
  },
  website: {
    icon: Globe,
    label: 'Website',
    placeholder: 'https://yourwebsite.com',
  }
};

export default function SocialLinks({ profileId, isEditing = false, onUpdate }: SocialLinksProps) {
  const [links, setLinks] = useState<Link[]>([]);
  const [editingLinks, setEditingLinks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLinks();
  }, [profileId]);

  const fetchLinks = async () => {
    const { data, error } = await supabase
      .from('links')
      .select('*')
      .eq('profile_id', profileId);

    if (error) {
      console.error('Error fetching links:', error);
    } else {
      setLinks(data || []);
      // Initialize editing links
      const linksMap: Record<string, string> = {};
      (data || []).forEach(link => {
        linksMap[link.platform] = link.url;
      });
      setEditingLinks(linksMap);
    }
  };

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSaveLinks = async () => {
    setLoading(true);
    setError(null);

    try {
      // Delete all existing links
      await supabase
        .from('links')
        .delete()
        .eq('profile_id', profileId);

      // Insert new links
      const newLinks = Object.entries(editingLinks)
        .filter(([_, url]) => url.trim() !== '')
        .map(([platform, url]) => ({
          profile_id: profileId,
          platform,
          url: url.trim()
        }));

      if (newLinks.length > 0) {
        // Validate all URLs
        for (const link of newLinks) {
          if (!validateUrl(link.url)) {
            setError(`Invalid URL for ${PLATFORMS[link.platform]?.label || link.platform}`);
            setLoading(false);
            return;
          }
        }

        const { error: insertError } = await supabase
          .from('links')
          .insert(newLinks);

        if (insertError) {
          throw insertError;
        }
      }

      await fetchLinks();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error saving links:', err);
      setError('Failed to save links');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkChange = (platform: string, value: string) => {
    setEditingLinks(prev => ({
      ...prev,
      [platform]: value
    }));
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="text-sm text-red-500 dark:text-red-400 mb-2">
            {error}
          </div>
        )}
        
        {Object.entries(PLATFORMS).map(([platform, config]) => {
          const Icon = config.icon;
          return (
            <div key={platform} className="flex items-center gap-3">
              <Icon size={20} className="text-onsurface-secondary flex-shrink-0" />
              <input
                type="url"
                value={editingLinks[platform] || ''}
                onChange={(e) => handleLinkChange(platform, e.target.value)}
                placeholder={config.placeholder}
                className="flex-1 p-2 border border-border rounded-md bg-transparent focus:outline-none focus:border-primary text-sm"
              />
            </div>
          );
        })}

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSaveLinks}
            disabled={loading}
            className="px-4 py-2 bg-primary text-white dark:text-background rounded-lg hover:bg-primary-hover transition-colors text-sm disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Links'}
          </button>
        </div>
      </div>
    );
  }

  // Display mode
  if (links.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {links.map((link) => {
        const config = PLATFORMS[link.platform] || { 
          icon: Globe, 
          label: link.platform 
        };
        const Icon = config.icon;
        
        return (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-surface-container-muted transition-colors group"
            aria-label={`${config.label} profile`}
          >
            <Icon size={16} className="text-onsurface-secondary group-hover:text-foreground" />
            <span className="text-sm text-onsurface-secondary group-hover:text-foreground">
              {config.label}
            </span>
            <ExternalLink size={12} className="text-onsurface-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        );
      })}
    </div>
  );
}