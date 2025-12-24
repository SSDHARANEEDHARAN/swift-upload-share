-- Add usage analytics columns to api_keys table
ALTER TABLE public.api_keys 
ADD COLUMN IF NOT EXISTS request_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS rate_limit integer DEFAULT 1000,
ADD COLUMN IF NOT EXISTS rate_limit_reset_at timestamp with time zone DEFAULT (date_trunc('month', now()) + interval '1 month');