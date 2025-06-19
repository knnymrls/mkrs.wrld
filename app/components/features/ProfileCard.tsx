'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface Profile {
  id: string;
  name: string;
  title?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  location?: string | null;
  created_at: string;
  skills?: Array<{ skill: string }>;
}

interface ProfileCardProps {
  profile: Profile;
}

export default function ProfileCard({ profile }: ProfileCardProps) {
  const router = useRouter();

  return (
    <div
      className="bg-surface-container rounded-2xl border-[1px] border-border hover:scale-105 transition-all duration-200 overflow-hidden group cursor-pointer break-inside-avoid mb-4"
      onClick={() => router.push(`/profile/${profile.id}`)}
    >
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-11 h-11 bg-avatar-bg rounded-full overflow-hidden flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name || 'Profile'}
                  className="w-full h-full object-cover"
                />
              ) : profile.name ? (
                <div className="w-full h-full flex items-center justify-center text-onsurface-secondary font-medium text-lg">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-onsurface-secondary font-medium text-lg">
                  ?
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-onsurface-primary truncate">{profile.name || 'Unknown User'}</h3>
              {profile.title && (
                <p className="text-sm text-onsurface-secondary truncate">{profile.title}</p>
              )}
            </div>
          </div>
          <span className="text-sm text-onsurface-secondary flex-shrink-0">
            {new Date(profile.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })}
          </span>
        </div>

        {profile.bio && (
          <p className="text-onsurface-primary leading-relaxed line-clamp-3">
            {profile.bio}
          </p>
        )}


      </div>
    </div>
  );
}