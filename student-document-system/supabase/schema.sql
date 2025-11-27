-- ============================================
-- Student Document PDF Storage System
-- Database Schema and Policies
-- ============================================

-- ============================================
-- 1. CREATE DOCUMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);

-- Add comments for documentation
COMMENT ON TABLE documents IS 'Stores metadata for uploaded PDF documents';
COMMENT ON COLUMN documents.id IS 'Unique identifier for the document';
COMMENT ON COLUMN documents.title IS 'Document title (required)';
COMMENT ON COLUMN documents.description IS 'Optional document description';
COMMENT ON COLUMN documents.file_path IS 'Path to file in Supabase Storage';
COMMENT ON COLUMN documents.uploaded_at IS 'Timestamp of when document was uploaded';
COMMENT ON COLUMN documents.user_id IS 'Reference to the user who uploaded the document';

-- ============================================
-- 2. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. CREATE RLS POLICIES FOR DOCUMENTS TABLE
-- ============================================

-- Policy: Users can view their own documents
CREATE POLICY "Users can view own documents"
ON documents
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own documents
CREATE POLICY "Users can insert own documents"
ON documents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own documents
CREATE POLICY "Users can update own documents"
ON documents
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete own documents"
ON documents
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 4. STORAGE BUCKET POLICIES
-- ============================================
-- Note: These need to be created in Supabase Storage UI or via API
-- But here's the SQL for reference

-- Allow authenticated users to upload to documents bucket
CREATE POLICY "Users can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated users to view documents
CREATE POLICY "Users can view documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated'
);

-- Allow users to delete their own documents from storage
CREATE POLICY "Users can delete own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own documents
CREATE POLICY "Users can update own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- 5. USEFUL FUNCTIONS (OPTIONAL)
-- ============================================

-- Function to get document count for a user
CREATE OR REPLACE FUNCTION get_user_document_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM documents WHERE user_id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get total storage used by user (in bytes)
CREATE OR REPLACE FUNCTION get_user_storage_usage(user_uuid UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(metadata->>'size')::BIGINT, 0)
    FROM storage.objects
    WHERE bucket_id = 'documents' 
    AND (storage.foldername(name))[1] = user_uuid::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ============================================

-- Note: You'll need to create actual users first via Supabase Auth
-- Then you can insert sample documents if needed

-- Example (replace with actual user IDs after creating users):
/*
INSERT INTO documents (title, description, file_path, user_id) VALUES
('Sample Document 1', 'This is a test document', 'user-id/sample1.pdf', 'actual-user-uuid'),
('Sample Document 2', 'Another test document', 'user-id/sample2.pdf', 'actual-user-uuid');
*/

-- ============================================
-- 7. VERIFICATION QUERIES
-- ============================================

-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'documents'
);

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'documents';

-- View all policies on documents table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'documents';

-- ============================================
-- 8. CLEANUP (USE WITH CAUTION)
-- ============================================

-- Uncomment below to drop everything (careful in production!)
/*
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
DROP TABLE IF EXISTS documents CASCADE;
DROP FUNCTION IF EXISTS get_user_document_count(UUID);
DROP FUNCTION IF EXISTS get_user_storage_usage(UUID);
*/