-- Create a table to track last read message per user per room
CREATE TABLE public.chat_read_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Enable RLS
ALTER TABLE public.chat_read_status ENABLE ROW LEVEL SECURITY;

-- Users can only see their own read status
CREATE POLICY "Users can view their own read status"
ON public.chat_read_status
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own read status
CREATE POLICY "Users can insert their own read status"
ON public.chat_read_status
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own read status
CREATE POLICY "Users can update their own read status"
ON public.chat_read_status
FOR UPDATE
USING (auth.uid() = user_id);

-- Create a function to get unread count per room for a user
CREATE OR REPLACE FUNCTION public.get_unread_counts(p_user_id UUID)
RETURNS TABLE(room_id UUID, unread_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.room_id,
    COUNT(cm.id)::BIGINT AS unread_count
  FROM chat_participants cp
  LEFT JOIN chat_read_status crs ON crs.room_id = cp.room_id AND crs.user_id = p_user_id
  LEFT JOIN chat_messages cm ON cm.room_id = cp.room_id 
    AND cm.created_at > COALESCE(crs.last_read_at, '1970-01-01'::timestamptz)
    AND cm.sender_id != p_user_id
  WHERE cp.user_id = p_user_id AND cp.is_accepted = true
  GROUP BY cp.room_id;
END;
$$;

-- Create a table to track online presence globally (for user search)
CREATE TABLE public.user_presence (
  user_id UUID PRIMARY KEY,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_online BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Everyone can see presence
CREATE POLICY "Anyone can view presence"
ON public.user_presence
FOR SELECT
USING (true);

-- Users can manage their own presence
CREATE POLICY "Users can manage their own presence"
ON public.user_presence
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presence"
ON public.user_presence
FOR UPDATE
USING (auth.uid() = user_id);

-- Function to get online user IDs
CREATE OR REPLACE FUNCTION public.get_online_user_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM user_presence
  WHERE is_online = true 
    AND last_seen_at > now() - interval '5 minutes';
$$;