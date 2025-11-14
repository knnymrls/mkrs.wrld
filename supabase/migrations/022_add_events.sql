-- Create events table
CREATE TABLE events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    max_participants INTEGER,
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event_participants table to track who's joining events
CREATE TABLE event_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_event_participants_event ON event_participants(event_id);
CREATE INDEX idx_event_participants_user ON event_participants(user_id);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies for events
-- Everyone can view events
CREATE POLICY "Anyone can view events" ON events
    FOR SELECT USING (true);

-- Users can create events
CREATE POLICY "Users can create events" ON events
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can update their own events
CREATE POLICY "Users can update their own events" ON events
    FOR UPDATE USING (auth.uid() = created_by);

-- Users can delete their own events
CREATE POLICY "Users can delete their own events" ON events
    FOR DELETE USING (auth.uid() = created_by);

-- RLS policies for event_participants
-- Everyone can view participants
CREATE POLICY "Anyone can view event participants" ON event_participants
    FOR SELECT USING (true);

-- Users can join events
CREATE POLICY "Users can join events" ON event_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can leave events (delete their participation)
CREATE POLICY "Users can leave events" ON event_participants
    FOR DELETE USING (auth.uid() = user_id);

-- Add trigger to update updated_at
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


