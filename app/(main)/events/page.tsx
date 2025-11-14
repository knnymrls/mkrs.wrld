"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import LazyImage from "@/app/components/ui/LazyImage";
import { format, isPast, isToday, isFuture } from "date-fns";
import { Calendar, MapPin, Users, Plus, X } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_date: string;
  end_date: string | null;
  max_participants: number | null;
  created_by: string;
  created_at: string;
  creator: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  participants: Array<{
    id: string;
    user_id: string;
    profile: {
      id: string;
      name: string;
      avatar_url: string | null;
    };
  }>;
  user_has_joined: boolean;
}

export default function EventsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");

  useEffect(() => {
    fetchEvents();
  }, [user]);

  const fetchEvents = async () => {
    try {
      setLoading(true);

      // Fetch events with creator info
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select(
          `
          *,
          profiles!created_by (
            id,
            name,
            avatar_url
          )
        `
        )
        .order("start_date", { ascending: true });

      if (eventsError) throw eventsError;

      // Fetch participants for each event
      const eventsWithParticipants = await Promise.all(
        (eventsData || []).map(async (event: any) => {
          const { data: participantsData } = await supabase
            .from("event_participants")
            .select(
              `
              id,
              user_id,
              profiles!user_id (
                id,
                name,
                avatar_url
              )
            `
            )
            .eq("event_id", event.id);

          const userHasJoined = user
            ? participantsData?.some((p: any) => p.user_id === user.id)
            : false;

          return {
            ...event,
            creator: event.profiles,
            participants: participantsData || [],
            user_has_joined: Boolean(userHasJoined),
          };
        })
      );

      setEvents(eventsWithParticipants);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    if (!user) {
      alert("Please sign in to join events");
      return;
    }

    try {
      const { error } = await supabase.from("event_participants").insert({
        event_id: eventId,
        user_id: user.id,
      });

      if (error) throw error;

      await fetchEvents();
    } catch (error: any) {
      if (error.code === "23505") {
        alert("You have already joined this event");
      } else {
        console.error("Error joining event:", error);
        alert("Failed to join event");
      }
    }
  };

  const handleLeaveEvent = async (eventId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("event_participants")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user.id);

      if (error) throw error;

      await fetchEvents();
    } catch (error) {
      console.error("Error leaving event:", error);
      alert("Failed to leave event");
    }
  };

  const filteredEvents = events.filter((event) => {
    const startDate = new Date(event.start_date);
    if (filter === "upcoming") return isFuture(startDate) || isToday(startDate);
    if (filter === "past") return isPast(startDate) && !isToday(startDate);
    return true;
  });

  const getEventStatus = (event: Event) => {
    const startDate = new Date(event.start_date);
    if (isPast(startDate) && !isToday(startDate)) return "past";
    if (isToday(startDate)) return "today";
    return "upcoming";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-surface-container/80 backdrop-blur-md border-b border-border">
        <div className="px-4 sm:px-6 lg:px-9 py-4 sm:py-6 mx-auto w-full">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl sm:text-3xl font-semibold text-onsurface-primary">
              Events
            </h1>
            {user && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-hover rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Event
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-9 py-6 sm:py-8 lg:py-12 mx-auto w-full">
        {/* Filter Buttons */}
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
            {(["all", "upcoming", "past"] as const).map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                  filter === filterOption
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-surface-container text-onsurface-primary hover:bg-surface-container-muted border border-border"
                }`}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Events List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-5xl mb-3">📅</div>
              <p className="text-sm text-onsurface-secondary font-medium">
                Loading events...
              </p>
            </div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-5xl mb-3">📅</div>
              <p className="text-sm text-onsurface-secondary font-medium">
                No {filter !== "all" ? filter : ""} events found.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => {
              const status = getEventStatus(event);
              const isFull =
                event.max_participants &&
                event.participants.length >= event.max_participants;

              return (
                <div
                  key={event.id}
                  className="bg-surface-container rounded-xl border border-border p-5 sm:p-6 hover:bg-surface-container-muted hover:border-primary/30 transition-all"
                >
                  {/* Event Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-onsurface-primary mb-2 truncate">
                        {event.title}
                      </h3>
                      {status === "today" && (
                        <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-lg bg-primary/10 text-primary border border-primary/20 mb-2">
                          Today
                        </span>
                      )}
                      {status === "past" && (
                        <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-lg bg-surface-container-muted text-onsurface-secondary border border-border mb-2">
                          Past
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Event Description */}
                  {event.description && (
                    <p className="text-sm text-onsurface-secondary mb-4 line-clamp-3 leading-relaxed">
                      {event.description}
                    </p>
                  )}

                  {/* Event Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-onsurface-secondary">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span>
                        {format(
                          new Date(event.start_date),
                          "MMM d, yyyy h:mm a"
                        )}
                        {event.end_date &&
                          ` - ${format(new Date(event.end_date), "h:mm a")}`}
                      </span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-onsurface-secondary">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-onsurface-secondary">
                      <Users className="w-4 h-4 flex-shrink-0" />
                      <span>
                        {event.participants.length}
                        {event.max_participants
                          ? ` / ${event.max_participants}`
                          : ""}{" "}
                        participants
                      </span>
                    </div>
                  </div>

                  {/* Creator */}
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border/50">
                    <div className="w-6 h-6 bg-avatar-bg rounded-full overflow-hidden flex-shrink-0">
                      {event.creator.avatar_url ? (
                        <LazyImage
                          src={event.creator.avatar_url}
                          alt={event.creator.name}
                          className="w-full h-full object-cover"
                          placeholder="blur"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-onsurface-secondary text-xs font-medium">
                          {event.creator.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-onsurface-secondary">
                      Created by {event.creator.name}
                    </p>
                  </div>

                  {/* Join/Leave Button */}
                  {user && status !== "past" && (
                    <button
                      onClick={() =>
                        event.user_has_joined
                          ? handleLeaveEvent(event.id)
                          : handleJoinEvent(event.id)
                      }
                      disabled={(!event.user_has_joined && isFull) || false}
                      className={`w-full px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                        event.user_has_joined
                          ? "bg-surface-container-muted text-onsurface-primary hover:bg-surface-container border border-border"
                          : isFull
                          ? "bg-surface-container-muted text-onsurface-secondary cursor-not-allowed"
                          : "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm"
                      }`}
                    >
                      {event.user_has_joined
                        ? "Leave Event"
                        : isFull
                        ? "Event Full"
                        : "Join Event"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {isCreateModalOpen && (
        <CreateEventModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onEventCreated={fetchEvents}
        />
      )}
    </div>
  );
}

// Create Event Modal Component
interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: () => void;
}

function CreateEventModal({
  isOpen,
  onClose,
  onEventCreated,
}: CreateEventModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxParticipants, setMaxParticipants] = useState<number | "">("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !startDate) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("events").insert({
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        start_date: startDate,
        end_date: endDate || null,
        max_participants: maxParticipants ? Number(maxParticipants) : null,
        created_by: user.id,
      });

      if (error) throw error;

      onEventCreated();
      onClose();
      // Reset form
      setTitle("");
      setDescription("");
      setLocation("");
      setStartDate("");
      setEndDate("");
      setMaxParticipants("");
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/35 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-surface-container rounded-xl w-full max-w-md flex flex-col p-6 gap-4 shadow-lg border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-onsurface-primary">
            Create Event
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-onsurface-secondary hover:text-onsurface-primary hover:bg-surface-container-muted rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-onsurface-primary mb-1.5">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-surface-container-muted border border-border rounded-xl text-onsurface-primary placeholder:text-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Event title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-onsurface-primary mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 bg-surface-container-muted border border-border rounded-xl text-onsurface-primary placeholder:text-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              placeholder="Event description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-onsurface-primary mb-1.5">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface-container-muted border border-border rounded-xl text-onsurface-primary placeholder:text-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Event location"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-onsurface-primary mb-1.5">
                Start Date & Time *
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-surface-container-muted border border-border rounded-xl text-onsurface-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-onsurface-primary mb-1.5">
                End Date & Time
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-4 py-2.5 bg-surface-container-muted border border-border rounded-xl text-onsurface-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-onsurface-primary mb-1.5">
              Max Participants
            </label>
            <input
              type="number"
              value={maxParticipants}
              onChange={(e) =>
                setMaxParticipants(e.target.value ? Number(e.target.value) : "")
              }
              min={1}
              className="w-full px-4 py-2.5 bg-surface-container-muted border border-border rounded-xl text-onsurface-primary placeholder:text-onsurface-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="No limit"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading || !title.trim() || !startDate}
              className="flex-1 px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Event"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-onsurface-primary bg-surface-container-muted rounded-xl hover:bg-surface-container border border-border transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
