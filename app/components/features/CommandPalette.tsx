"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import LazyImage from "@/app/components/ui/LazyImage";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/app/components/ui/command";
import {
  Home,
  MessageSquare,
  FolderOpen,
  Calendar,
  User,
  Search as SearchIcon,
  Settings,
  Bell,
  LogOut,
  Plus,
  Users,
  Briefcase,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<{
    profiles: any[];
    projects: any[];
    events: any[];
    posts: any[];
    comments: any[];
    projectRequests: any[];
    skills: any[];
  }>({
    profiles: [],
    projects: [],
    events: [],
    posts: [],
    comments: [],
    projectRequests: [],
    skills: [],
  });
  const [isSearching, setIsSearching] = React.useState(false);

  // Comprehensive search functionality
  React.useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 1) {
      setSearchResults({
        profiles: [],
        projects: [],
        events: [],
        posts: [],
        comments: [],
        projectRequests: [],
        skills: [],
      });
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const query = searchQuery.trim();

        // Search everything in parallel
        const [
          profilesRes,
          projectsRes,
          eventsRes,
          postsRes,
          commentsRes,
          projectRequestsRes,
          skillsRes,
        ] = await Promise.all([
          // Search profiles - name, title, bio, location
          supabase
            .from("profiles")
            .select("id, name, title, bio, location, avatar_url")
            .or(
              `name.ilike.%${query}%,title.ilike.%${query}%,bio.ilike.%${query}%,location.ilike.%${query}%`
            )
            .not("name", "is", null)
            .limit(10),

          // Search projects - title, description, status
          supabase
            .from("projects")
            .select("id, title, description, status, icon")
            .or(
              `title.ilike.%${query}%,description.ilike.%${query}%,status.ilike.%${query}%`
            )
            .limit(10),

          // Search events - title, description, location
          supabase
            .from("events")
            .select("id, title, description, location, start_date")
            .or(
              `title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`
            )
            .limit(10),

          // Search posts - content
          supabase
            .from("posts")
            .select(
              "id, content, author_id, created_at, profiles!posts_author_id_fkey(name, avatar_url)"
            )
            .ilike("content", `%${query}%`)
            .order("created_at", { ascending: false })
            .limit(10),

          // Search comments - content
          supabase
            .from("post_comments")
            .select(
              "id, content, post_id, author_id, created_at, profiles!post_comments_author_id_fkey(name)"
            )
            .ilike("content", `%${query}%`)
            .order("created_at", { ascending: false })
            .limit(10),

          // Search project requests - title, description, skills
          supabase
            .from("project_requests")
            .select("id, title, description, skills_needed, status")
            .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
            .limit(10),

          // Search skills - find profiles by skills
          supabase
            .from("skills")
            .select(
              "skill, profile_id, profiles!inner(id, name, title, avatar_url)"
            )
            .ilike("skill", `%${query}%`)
            .limit(10),
        ]);

        // Log errors for debugging
        if (profilesRes.error)
          console.error("Profiles search error:", profilesRes.error);
        if (projectsRes.error)
          console.error("Projects search error:", projectsRes.error);
        if (eventsRes.error)
          console.error("Events search error:", eventsRes.error);
        if (postsRes.error)
          console.error("Posts search error:", postsRes.error);
        if (commentsRes.error)
          console.error("Comments search error:", commentsRes.error);
        if (projectRequestsRes.error)
          console.error(
            "Project requests search error:",
            projectRequestsRes.error
          );
        if (skillsRes.error)
          console.error("Skills search error:", skillsRes.error);

        // Handle data - ensure arrays
        const profiles = Array.isArray(profilesRes.data)
          ? profilesRes.data
          : profilesRes.data
          ? [profilesRes.data]
          : [];
        const projects = Array.isArray(projectsRes.data)
          ? projectsRes.data
          : projectsRes.data
          ? [projectsRes.data]
          : [];
        const events = Array.isArray(eventsRes.data)
          ? eventsRes.data
          : eventsRes.data
          ? [eventsRes.data]
          : [];
        const posts = Array.isArray(postsRes.data)
          ? postsRes.data
          : postsRes.data
          ? [postsRes.data]
          : [];
        const comments = Array.isArray(commentsRes.data)
          ? commentsRes.data
          : commentsRes.data
          ? [commentsRes.data]
          : [];
        const projectRequests = Array.isArray(projectRequestsRes.data)
          ? projectRequestsRes.data
          : projectRequestsRes.data
          ? [projectRequestsRes.data]
          : [];
        const skills = Array.isArray(skillsRes.data)
          ? skillsRes.data
          : skillsRes.data
          ? [skillsRes.data]
          : [];

        console.log("Search results:", {
          query,
          profiles: profiles.length,
          projects: projects.length,
          events: events.length,
          posts: posts.length,
        });

        setSearchResults({
          profiles,
          projects,
          events,
          posts,
          comments,
          projectRequests,
          skills,
        });
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);

  const hasSearchResults =
    searchResults.profiles.length > 0 ||
    searchResults.projects.length > 0 ||
    searchResults.events.length > 0 ||
    searchResults.posts.length > 0 ||
    searchResults.comments.length > 0 ||
    searchResults.projectRequests.length > 0 ||
    searchResults.skills.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search anything..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList className="max-h-[400px]">
          <CommandEmpty>
            {isSearching
              ? "Searching..."
              : searchQuery.length < 1
              ? "Type to search anything..."
              : "No results found."}
          </CommandEmpty>

          {/* Navigation Commands - Show when no query or when query matches navigation */}
          {(!searchQuery ||
            [
              "home",
              "dashboard",
              "messages",
              "projects",
              "events",
              "graph",
              "profile",
              "notifications",
              "chatbot",
              "chat",
            ].some((nav) => searchQuery.toLowerCase().includes(nav))) && (
            <>
              <CommandGroup heading="Navigation">
                {(!searchQuery ||
                  ["home", "dashboard"].some((nav) =>
                    searchQuery.toLowerCase().includes(nav)
                  )) && (
                  <CommandItem
                    onSelect={() => {
                      router.push("/dashboard");
                      onOpenChange(false);
                    }}
                  >
                    <Home className="mr-2 h-4 w-4" />
                    <span>Home</span>
                  </CommandItem>
                )}
                {(!searchQuery ||
                  ["messages", "message", "chat"].some((nav) =>
                    searchQuery.toLowerCase().includes(nav)
                  )) && (
                  <CommandItem
                    onSelect={() => {
                      router.push("/messages");
                      onOpenChange(false);
                    }}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>Messages</span>
                  </CommandItem>
                )}
                {(!searchQuery ||
                  ["projects", "project"].some((nav) =>
                    searchQuery.toLowerCase().includes(nav)
                  )) && (
                  <CommandItem
                    onSelect={() => {
                      router.push("/projects");
                      onOpenChange(false);
                    }}
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    <span>Projects</span>
                  </CommandItem>
                )}
                {(!searchQuery ||
                  ["events", "event"].some((nav) =>
                    searchQuery.toLowerCase().includes(nav)
                  )) && (
                  <CommandItem
                    onSelect={() => {
                      router.push("/events");
                      onOpenChange(false);
                    }}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Events</span>
                  </CommandItem>
                )}
                {(!searchQuery ||
                  ["graph", "network"].some((nav) =>
                    searchQuery.toLowerCase().includes(nav)
                  )) && (
                  <CommandItem
                    onSelect={() => {
                      router.push("/graph");
                      onOpenChange(false);
                    }}
                  >
                    <SearchIcon className="mr-2 h-4 w-4" />
                    <span>Graph</span>
                  </CommandItem>
                )}
                {user &&
                  (!searchQuery ||
                    ["profile", "account"].some((nav) =>
                      searchQuery.toLowerCase().includes(nav)
                    )) && (
                    <CommandItem
                      onSelect={() => {
                        router.push("/profile");
                        onOpenChange(false);
                      }}
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </CommandItem>
                  )}
                {user &&
                  (!searchQuery ||
                    ["chatbot", "ai", "assistant"].some((nav) =>
                      searchQuery.toLowerCase().includes(nav)
                    )) && (
                    <CommandItem
                      onSelect={() => {
                        router.push("/chatbot");
                        onOpenChange(false);
                      }}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span>AI Chat</span>
                    </CommandItem>
                  )}
              </CommandGroup>

              <CommandSeparator />

              {/* Quick Actions */}
              <CommandGroup heading="Quick Actions">
                {user && (
                  <>
                    <CommandItem
                      onSelect={() => {
                        router.push("/");
                        onOpenChange(false);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Create Post</span>
                      <CommandShortcut>⌘⇧P</CommandShortcut>
                    </CommandItem>
                    <CommandItem
                      onSelect={() => {
                        router.push("/projects/new");
                        onOpenChange(false);
                      }}
                    >
                      <Briefcase className="mr-2 h-4 w-4" />
                      <span>Create Project</span>
                    </CommandItem>
                    <CommandItem
                      onSelect={() => {
                        router.push("/events");
                        onOpenChange(false);
                      }}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>Create Event</span>
                    </CommandItem>
                  </>
                )}
              </CommandGroup>

              {user && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Account">
                    <CommandItem
                      onSelect={() => {
                        router.push("/notifications");
                        onOpenChange(false);
                      }}
                    >
                      <Bell className="mr-2 h-4 w-4" />
                      <span>Notifications</span>
                    </CommandItem>
                    <CommandItem
                      onSelect={async () => {
                        await signOut();
                        onOpenChange(false);
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </>
          )}

          {/* Search Results */}
          {hasSearchResults && searchQuery.length >= 1 && (
            <>
              {/* People Results */}
              {searchResults.profiles.length > 0 && (
                <>
                  <CommandGroup heading="People">
                    {searchResults.profiles.map((profile) => (
                      <CommandItem
                        key={profile.id}
                        onSelect={() => {
                          router.push(`/profile/${profile.id}`);
                          onOpenChange(false);
                        }}
                      >
                        <div className="w-8 h-8 bg-avatar-bg rounded-full overflow-hidden flex-shrink-0 mr-2">
                          {profile.avatar_url ? (
                            <LazyImage
                              src={profile.avatar_url}
                              alt={profile.name || "Profile"}
                              className="w-full h-full object-cover"
                              placeholder="blur"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-onsurface-secondary font-medium text-sm">
                              {profile.name?.charAt(0).toUpperCase() || "U"}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="truncate">{profile.name}</span>
                          {profile.title && (
                            <span className="text-xs text-onsurface-secondary truncate">
                              {profile.title}
                            </span>
                          )}
                          {profile.location && (
                            <span className="text-xs text-onsurface-secondary truncate">
                              📍 {profile.location}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {/* Skills Results - People with matching skills */}
              {searchResults.skills.length > 0 && (
                <>
                  <CommandGroup heading="People by Skills">
                    {searchResults.skills.map((skill: any) => (
                      <CommandItem
                        key={`skill-${skill.profile_id}-${skill.skill}`}
                        onSelect={() => {
                          router.push(`/profile/${skill.profile_id}`);
                          onOpenChange(false);
                        }}
                      >
                        <div className="w-8 h-8 bg-avatar-bg rounded-full overflow-hidden flex-shrink-0 mr-2">
                          {skill.profiles?.avatar_url ? (
                            <LazyImage
                              src={skill.profiles.avatar_url}
                              alt={skill.profiles.name || "Profile"}
                              className="w-full h-full object-cover"
                              placeholder="blur"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-onsurface-secondary font-medium text-sm">
                              {skill.profiles?.name?.charAt(0).toUpperCase() ||
                                "U"}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="truncate">
                            {skill.profiles?.name}
                          </span>
                          <span className="text-xs text-onsurface-secondary truncate">
                            Skill: {skill.skill}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {/* Projects Results */}
              {searchResults.projects.length > 0 && (
                <>
                  <CommandGroup heading="Projects">
                    {searchResults.projects.map((project) => (
                      <CommandItem
                        key={project.id}
                        onSelect={() => {
                          router.push(`/projects/${project.id}`);
                          onOpenChange(false);
                        }}
                      >
                        <Briefcase className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span>{project.title}</span>
                          {project.description && (
                            <span className="text-xs text-onsurface-secondary truncate">
                              {project.description.substring(0, 60)}
                              {project.description.length > 60 ? "..." : ""}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {/* Project Requests Results */}
              {searchResults.projectRequests.length > 0 && (
                <>
                  <CommandGroup heading="Project Requests">
                    {searchResults.projectRequests.map((request) => (
                      <CommandItem
                        key={request.id}
                        onSelect={() => {
                          router.push(`/project-requests/${request.id}`);
                          onOpenChange(false);
                        }}
                      >
                        <Briefcase className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span>{request.title}</span>
                          {request.skills_needed &&
                            request.skills_needed.length > 0 && (
                              <span className="text-xs text-onsurface-secondary">
                                Skills:{" "}
                                {request.skills_needed.slice(0, 3).join(", ")}
                                {request.skills_needed.length > 3 ? "..." : ""}
                              </span>
                            )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {/* Events Results */}
              {searchResults.events.length > 0 && (
                <>
                  <CommandGroup heading="Events">
                    {searchResults.events.map((event) => (
                      <CommandItem
                        key={event.id}
                        onSelect={() => {
                          router.push(`/events`);
                          onOpenChange(false);
                        }}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span>{event.title}</span>
                          {event.location && (
                            <span className="text-xs text-onsurface-secondary">
                              📍 {event.location}
                            </span>
                          )}
                          {event.start_date && (
                            <span className="text-xs text-onsurface-secondary">
                              {new Date(event.start_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {/* Posts Results */}
              {searchResults.posts.length > 0 && (
                <>
                  <CommandGroup heading="Posts">
                    {searchResults.posts.map((post: any) => (
                      <CommandItem
                        key={post.id}
                        onSelect={() => {
                          router.push(`/?post=${post.id}`);
                          onOpenChange(false);
                        }}
                      >
                        <div className="w-8 h-8 bg-avatar-bg rounded-full overflow-hidden flex-shrink-0 mr-2">
                          {post.profiles?.avatar_url ? (
                            <LazyImage
                              src={post.profiles.avatar_url}
                              alt={post.profiles.name || "Author"}
                              className="w-full h-full object-cover"
                              placeholder="blur"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-onsurface-secondary font-medium text-sm">
                              {post.profiles?.name?.charAt(0).toUpperCase() ||
                                "A"}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="truncate">
                            {post.content?.substring(0, 60)}
                            {post.content?.length > 60 ? "..." : ""}
                          </span>
                          {post.profiles?.name && (
                            <span className="text-xs text-onsurface-secondary truncate">
                              by {post.profiles.name}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {/* Comments Results */}
              {searchResults.comments.length > 0 && (
                <CommandGroup heading="Comments">
                  {searchResults.comments.map((comment: any) => (
                    <CommandItem
                      key={comment.id}
                      onSelect={() => {
                        router.push(`/?post=${comment.post_id}`);
                        onOpenChange(false);
                      }}
                    >
                      <div className="w-8 h-8 bg-avatar-bg rounded-full overflow-hidden flex-shrink-0 mr-2">
                        {comment.profiles?.avatar_url ? (
                          <LazyImage
                            src={comment.profiles.avatar_url}
                            alt={comment.profiles.name || "Author"}
                            className="w-full h-full object-cover"
                            placeholder="blur"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-onsurface-secondary font-medium text-sm">
                            {comment.profiles?.name?.charAt(0).toUpperCase() ||
                              "A"}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="truncate">
                          {comment.content?.substring(0, 60)}
                          {comment.content?.length > 60 ? "..." : ""}
                        </span>
                        {comment.profiles?.name && (
                          <span className="text-xs text-onsurface-secondary truncate">
                            by {comment.profiles.name}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
