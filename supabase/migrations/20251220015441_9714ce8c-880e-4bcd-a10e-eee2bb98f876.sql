-- Create shared_notes table for real-time collaborative notes
CREATE TABLE public.shared_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  title TEXT NOT NULL DEFAULT 'Untitled Note',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.shared_notes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read notes by share_token (public access for collaboration)
CREATE POLICY "Anyone can view shared notes" 
ON public.shared_notes 
FOR SELECT 
USING (true);

-- Allow anyone to update shared notes (for real-time collaboration)
CREATE POLICY "Anyone can update shared notes" 
ON public.shared_notes 
FOR UPDATE 
USING (true);

-- Allow anyone to create new notes
CREATE POLICY "Anyone can create shared notes" 
ON public.shared_notes 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to delete shared notes
CREATE POLICY "Anyone can delete shared notes" 
ON public.shared_notes 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_shared_notes_updated_at
BEFORE UPDATE ON public.shared_notes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for the shared_notes table
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_notes;