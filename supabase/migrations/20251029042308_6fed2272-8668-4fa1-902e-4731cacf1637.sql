-- Update transfers bucket to allow 100MB files
UPDATE storage.buckets 
SET file_size_limit = 104857600
WHERE id = 'transfers';