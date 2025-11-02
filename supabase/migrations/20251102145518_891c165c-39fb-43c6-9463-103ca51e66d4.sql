-- Add batch_id to files table to group multiple files together
ALTER TABLE files ADD COLUMN batch_id uuid DEFAULT gen_random_uuid();

-- Create index for faster batch queries
CREATE INDEX idx_files_batch_id ON files(batch_id);

-- Update existing files to have their own batch_id
UPDATE files SET batch_id = gen_random_uuid() WHERE batch_id IS NULL;