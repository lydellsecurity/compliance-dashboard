-- Migration: Add evidence_url column to user_responses table
-- This column stores the URL to AI-generated policy PDFs stored in Supabase Storage

-- Add evidence_url column to user_responses if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_responses'
        AND column_name = 'evidence_url'
    ) THEN
        ALTER TABLE user_responses ADD COLUMN evidence_url TEXT;
        COMMENT ON COLUMN user_responses.evidence_url IS 'URL to AI-generated policy PDF in Supabase Storage';
    END IF;
END $$;

-- Create the 'evidence' storage bucket if it doesn't exist
-- Note: This needs to be run via the Supabase Dashboard or CLI
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('evidence', 'evidence', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policy to allow authenticated users to upload to their org folder
-- CREATE POLICY "Users can upload to their org folder"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'evidence' AND
--   (storage.foldername(name))[1] = auth.jwt() ->> 'organization_id'
-- );

-- Storage policy to allow public read access to evidence files
-- CREATE POLICY "Public read access to evidence"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'evidence');

-- Index on evidence_url for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_responses_evidence_url
ON user_responses(evidence_url)
WHERE evidence_url IS NOT NULL;
