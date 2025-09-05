'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Notification, NotificationType } from '@/app/models/Notification';
import NotificationTypeIcon from '@/app/components/ui/NotificationTypeIcon';

type FilterType = 'all' | 'unread' | 'mentions' | 'comments' | 'projects';

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('notifications')
        .select(`
          *,
          actor:actor_id (
            id,
            name,
            avatar_url
          ),
          post:post_id (
            id,
            content
          ),
          comment:comment_id (
            id,
            content
          )
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filter === 'unread') {
        query = query.eq('read', false);
      } else if (filter === 'mentions') {
        query = query.in('type', ['post_mention', 'comment_mention', 'project_mention']);
      } else if (filter === 'comments') {
        query = query.eq('type', 'comment_on_post');
      } else if (filter === 'projects') {
        query = query.in('type', ['project_mention', 'project_added_as_contributor']);
      }

      const { data, error } = await query;

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user, filter]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('recipient_id', user.id);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [user]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user || markingAllRead) return;

    setMarkingAllRead(true);
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('recipient_id', user.id)
        .eq('read', false);

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  }, [user, markingAllRead]);

  // Handle notification click
  const handleNotificationClick = useCallback(async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate based on type
    if (notification.post_id) {
      // Navigate to home and open post modal
      router.push(`/?post=${notification.post_id}`);
    } else if (notification.project_id && notification.type === 'project_added_as_contributor') {
      // Navigate to project page
      router.push(`/projects/${notification.project_id}`);
    }
  }, [markAsRead, router]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-page')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`
        },
        async (payload: any) => {
          // Fetch the full notification with relations
          const { data } = await supabase
            .from('notifications')
            .select(`
              *,
              actor:actor_id (
                id,
                name,
                avatar_url
              ),
              post:post_id (
                id,
                content
              ),
              comment:comment_id (
                id,
                content
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setNotifications(prev => [data, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Fetch notifications on mount and filter change
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Filter options
  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread' },
    { value: 'mentions', label: 'Mentions' },
    { value: 'comments', label: 'Comments' },
    { value: 'projects', label: 'Projects' },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-9">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-medium text-onsurface-primary mb-4">Notifications</h1>
          
          {/* Filters and Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex gap-2 flex-wrap">
              {filterOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filter === option.value
                      ? 'bg-primary text-white dark:text-background'
                      : 'bg-surface-container text-onsurface-secondary hover:bg-surface-container-muted'
                  }`}
                >
                  {option.label}
                  {option.value === 'unread' && unreadCount > 0 && (
                    <span className="ml-1">({unreadCount})</span>
                  )}
                </button>
              ))}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={markingAllRead}
                className="text-sm text-primary hover:underline disabled:opacity-50"
              >
                {markingAllRead ? 'Marking...' : 'Mark all as read'}
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-2">
          {loading ? (
            // Loading skeletons
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface-container rounded-lg p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-surface-container-muted rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-surface-container-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-surface-container-muted rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-onsurface-secondary mb-2">
                {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
              </p>
              <p className="text-sm text-onsurface-tertiary">
                When someone interacts with your posts, you'll see it here
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`bg-surface-container rounded-lg p-4 cursor-pointer transition-all hover:bg-surface-container-muted ${
                  !notification.read ? 'border-l-4 border-primary' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <NotificationTypeIcon type={notification.type} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-onsurface-primary">
                      {notification.actor && (
                        <span className="font-medium">{notification.actor.name}</span>
                      )}
                      {' '}
                      {notification.type === 'post_mention' && 'mentioned you in a post'}
                      {notification.type === 'comment_mention' && 'mentioned you in a comment'}
                      {notification.type === 'project_mention' && 'mentioned you in a project'}
                      {notification.type === 'comment_on_post' && 'commented on your post'}
                      {notification.type === 'project_added_as_contributor' && 'added you as a contributor'}
                    </p>
                    
                    {notification.post?.content && (
                      <p className="text-sm text-onsurface-secondary mt-1 line-clamp-2">
                        {notification.post.content}
                      </p>
                    )}
                    
                    {notification.comment?.content && (
                      <p className="text-sm text-onsurface-secondary mt-1 line-clamp-2">
                        "{notification.comment.content}"
                      </p>
                    )}
                    
                    <p className="text-xs text-onsurface-tertiary mt-1">
                      {formatTimeAgo(notification.created_at)}
                    </p>
                  </div>

                  {!notification.read && (
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2"></div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to format time
function formatTimeAgo(date: string): string {
  const now = new Date();
  const notificationDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return notificationDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: notificationDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}