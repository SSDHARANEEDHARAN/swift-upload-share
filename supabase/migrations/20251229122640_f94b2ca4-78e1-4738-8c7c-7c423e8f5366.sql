-- Create chat rooms table
CREATE TABLE public.chat_rooms (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    warning_shown_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create chat participants table
CREATE TABLE public.chat_participants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    is_accepted BOOLEAN DEFAULT false,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(room_id, user_id)
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_rooms
CREATE POLICY "Users can view rooms they participate in"
ON public.chat_rooms FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_participants 
        WHERE room_id = id AND user_id = auth.uid()
    )
);

CREATE POLICY "Authenticated users can create rooms"
ON public.chat_rooms FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Admin can update their rooms"
ON public.chat_rooms FOR UPDATE
USING (admin_id = auth.uid());

CREATE POLICY "Admin can delete their rooms"
ON public.chat_rooms FOR DELETE
USING (admin_id = auth.uid());

-- RLS policies for chat_participants
CREATE POLICY "Users can view participants in their rooms"
ON public.chat_participants FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_participants cp
        WHERE cp.room_id = room_id AND cp.user_id = auth.uid()
    )
);

CREATE POLICY "Authenticated users can add participants"
ON public.chat_participants FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own participation"
ON public.chat_participants FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admin can delete participants"
ON public.chat_participants FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.chat_rooms
        WHERE id = room_id AND admin_id = auth.uid()
    )
);

-- RLS policies for chat_messages
CREATE POLICY "Users can view messages in their rooms"
ON public.chat_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_participants
        WHERE room_id = chat_messages.room_id AND user_id = auth.uid() AND is_accepted = true
    )
);

CREATE POLICY "Participants can send messages"
ON public.chat_messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM public.chat_participants
        WHERE room_id = chat_messages.room_id AND user_id = auth.uid() AND is_accepted = true
    )
);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;

-- Function to update last activity
CREATE OR REPLACE FUNCTION public.update_chat_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.chat_rooms 
    SET last_activity_at = now(), warning_shown_at = NULL
    WHERE id = NEW.room_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update activity on new message
CREATE TRIGGER on_new_message_update_activity
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.update_chat_activity();