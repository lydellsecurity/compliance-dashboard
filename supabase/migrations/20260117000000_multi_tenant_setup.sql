-- ============================================================================
-- MULTI-TENANT SETUP MIGRATION
-- ============================================================================
-- This migration sets up complete multi-tenant infrastructure:
-- 1. Organization branding columns
-- 2. Trust Center access tokens (token-protected links)
-- 3. Organization invitations (email-based team invites)
-- 4. Organization members (many-to-many user-org relationship)
-- 5. Row Level Security (RLS) policies for data isolation
-- ============================================================================

-- ============================================================================
-- PART 1: ORGANIZATION BRANDING COLUMNS
-- ============================================================================

-- Add branding and slug columns to organizations table
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Generate slugs for existing organizations that don't have one
UPDATE organizations
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(id::text, 1, 8)
WHERE slug IS NULL;

-- Make slug NOT NULL after populating
ALTER TABLE organizations ALTER COLUMN slug SET NOT NULL;

-- Unique slug constraint (may already exist, so use DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_slug_unique'
  ) THEN
    ALTER TABLE organizations ADD CONSTRAINT organizations_slug_unique UNIQUE (slug);
  END IF;
END $$;

-- Index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- ============================================================================
-- PART 2: TRUST CENTER ACCESS TOKENS
-- ============================================================================

-- Table for managing shareable Trust Center links
CREATE TABLE IF NOT EXISTS trust_center_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255), -- Descriptive name: "Client ABC link", "Investor portal"
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL = never expires
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for token lookups
CREATE INDEX IF NOT EXISTS idx_trust_center_tokens_token ON trust_center_tokens(token);
CREATE INDEX IF NOT EXISTS idx_trust_center_tokens_org ON trust_center_tokens(organization_id);

-- ============================================================================
-- PART 3: ORGANIZATION INVITATIONS
-- ============================================================================

-- Table for managing team invitations
CREATE TABLE IF NOT EXISTS organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  token VARCHAR(64) NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for invite lookups
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON organization_invites(email);
CREATE INDEX IF NOT EXISTS idx_org_invites_token ON organization_invites(token);
CREATE INDEX IF NOT EXISTS idx_org_invites_org ON organization_invites(organization_id);

-- ============================================================================
-- PART 4: ORGANIZATION MEMBERS (Many-to-Many)
-- ============================================================================

-- Table for user-organization membership
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  is_default BOOLEAN DEFAULT false, -- User's default org on login
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Indexes for member lookups
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);

-- Function to ensure only one default org per user
CREATE OR REPLACE FUNCTION ensure_single_default_org()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE organization_members
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for single default org
DROP TRIGGER IF EXISTS trigger_single_default_org ON organization_members;
CREATE TRIGGER trigger_single_default_org
  BEFORE INSERT OR UPDATE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_org();

-- ============================================================================
-- PART 4.5: CREATE PROFILES TABLE IF NOT EXISTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create control_responses table if not exists
CREATE TABLE IF NOT EXISTS public.control_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    control_id TEXT NOT NULL,
    response TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID,
    UNIQUE(organization_id, control_id)
);

-- ============================================================================
-- PART 5: ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tenant-scoped tables (use DO block to handle if table doesn't exist)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_center_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Enable RLS on tables that may or may not exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evidence_records' AND table_schema = 'public') THEN
        ALTER TABLE evidence_records ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_controls' AND table_schema = 'public') THEN
        ALTER TABLE custom_controls ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_responses' AND table_schema = 'public') THEN
        ALTER TABLE user_responses ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log' AND table_schema = 'public') THEN
        ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ============================================================================
-- PART 6: RLS POLICIES - ORGANIZATIONS
-- ============================================================================

-- Users can view organizations they are members of
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Public can view organization by slug for Trust Center (token validated in app)
DROP POLICY IF EXISTS "Public can view org by slug" ON organizations;
CREATE POLICY "Public can view org by slug"
  ON organizations FOR SELECT
  USING (true); -- Token validation happens at application level

-- Owners/admins can update their organization
DROP POLICY IF EXISTS "Admins can update their organization" ON organizations;
CREATE POLICY "Admins can update their organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Users can create organizations
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- PART 7: RLS POLICIES - PROFILES
-- ============================================================================

-- Users can view profiles in their organizations
DROP POLICY IF EXISTS "Users can view profiles in their org" ON profiles;
CREATE POLICY "Users can view profiles in their org"
  ON profiles FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
    OR id = auth.uid()
  );

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- PART 8: RLS POLICIES - CONTROL RESPONSES
-- ============================================================================

-- Users can view control responses in their organizations
DROP POLICY IF EXISTS "Users can view control responses" ON control_responses;
CREATE POLICY "Users can view control responses"
  ON control_responses FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Users can insert control responses for their organizations
DROP POLICY IF EXISTS "Users can insert control responses" ON control_responses;
CREATE POLICY "Users can insert control responses"
  ON control_responses FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Users can update control responses in their organizations
DROP POLICY IF EXISTS "Users can update control responses" ON control_responses;
CREATE POLICY "Users can update control responses"
  ON control_responses FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- PART 9: RLS POLICIES - EVIDENCE RECORDS (conditional)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evidence_records' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can view evidence" ON evidence_records;
    CREATE POLICY "Users can view evidence"
      ON evidence_records FOR SELECT
      USING (
        organization_id IN (
          SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "Users can insert evidence" ON evidence_records;
    CREATE POLICY "Users can insert evidence"
      ON evidence_records FOR INSERT
      WITH CHECK (
        organization_id IN (
          SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "Users can update evidence" ON evidence_records;
    CREATE POLICY "Users can update evidence"
      ON evidence_records FOR UPDATE
      USING (
        organization_id IN (
          SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "Users can delete evidence" ON evidence_records;
    CREATE POLICY "Users can delete evidence"
      ON evidence_records FOR DELETE
      USING (
        organization_id IN (
          SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================================
-- PART 10: RLS POLICIES - CUSTOM CONTROLS (conditional)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_controls' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can view custom controls" ON custom_controls;
    CREATE POLICY "Users can view custom controls"
      ON custom_controls FOR SELECT
      USING (
        organization_id IN (
          SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "Users can manage custom controls" ON custom_controls;
    CREATE POLICY "Users can manage custom controls"
      ON custom_controls FOR ALL
      USING (
        organization_id IN (
          SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================================
-- PART 11: RLS POLICIES - USER RESPONSES (conditional)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_responses' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can view user responses" ON user_responses;
    CREATE POLICY "Users can view user responses"
      ON user_responses FOR SELECT
      USING (
        organization_id IN (
          SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "Users can manage user responses" ON user_responses;
    CREATE POLICY "Users can manage user responses"
      ON user_responses FOR ALL
      USING (
        organization_id IN (
          SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================================
-- PART 12: RLS POLICIES - AUDIT LOG (conditional)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can view audit logs" ON audit_log;
    CREATE POLICY "Users can view audit logs"
      ON audit_log FOR SELECT
      USING (
        organization_id IN (
          SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "System can insert audit logs" ON audit_log;
    CREATE POLICY "System can insert audit logs"
      ON audit_log FOR INSERT
      WITH CHECK (
        organization_id IN (
          SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================================
-- PART 13: RLS POLICIES - TRUST CENTER TOKENS
-- ============================================================================

-- Admins can manage trust center tokens
DROP POLICY IF EXISTS "Admins can view trust center tokens" ON trust_center_tokens;
CREATE POLICY "Admins can view trust center tokens"
  ON trust_center_tokens FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can manage trust center tokens" ON trust_center_tokens;
CREATE POLICY "Admins can manage trust center tokens"
  ON trust_center_tokens FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Public can validate tokens (for Trust Center access)
DROP POLICY IF EXISTS "Public can validate tokens" ON trust_center_tokens;
CREATE POLICY "Public can validate tokens"
  ON trust_center_tokens FOR SELECT
  USING (true); -- App validates token and checks is_active/expires_at

-- ============================================================================
-- PART 14: RLS POLICIES - ORGANIZATION INVITES
-- ============================================================================

-- Admins can manage invites
DROP POLICY IF EXISTS "Admins can view invites" ON organization_invites;
CREATE POLICY "Admins can view invites"
  ON organization_invites FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can manage invites" ON organization_invites;
CREATE POLICY "Admins can manage invites"
  ON organization_invites FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Public can validate invite tokens (for accepting invites)
DROP POLICY IF EXISTS "Public can validate invite tokens" ON organization_invites;
CREATE POLICY "Public can validate invite tokens"
  ON organization_invites FOR SELECT
  USING (true); -- App validates token

-- ============================================================================
-- PART 15: RLS POLICIES - ORGANIZATION MEMBERS
-- ============================================================================

-- Users can view their own memberships
DROP POLICY IF EXISTS "Users can view own memberships" ON organization_members;
CREATE POLICY "Users can view own memberships"
  ON organization_members FOR SELECT
  USING (user_id = auth.uid());

-- Users can view other members in their orgs
DROP POLICY IF EXISTS "Users can view org members" ON organization_members;
CREATE POLICY "Users can view org members"
  ON organization_members FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Admins can manage members
DROP POLICY IF EXISTS "Admins can manage members" ON organization_members;
CREATE POLICY "Admins can manage members"
  ON organization_members FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Users can insert themselves (for accepting invites)
DROP POLICY IF EXISTS "Users can add themselves" ON organization_members;
CREATE POLICY "Users can add themselves"
  ON organization_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own membership (e.g., is_default)
DROP POLICY IF EXISTS "Users can update own membership" ON organization_members;
CREATE POLICY "Users can update own membership"
  ON organization_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- PART 16: STORAGE POLICIES - BRANDING BUCKET
-- ============================================================================

-- Create branding bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding',
  'branding',
  true, -- Public read for logos
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload branding to their org folder
DROP POLICY IF EXISTS "Users can upload branding" ON storage.objects;
CREATE POLICY "Users can upload branding"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'branding' AND
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update their org's branding
DROP POLICY IF EXISTS "Users can update branding" ON storage.objects;
CREATE POLICY "Users can update branding"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'branding' AND
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete their org's branding
DROP POLICY IF EXISTS "Users can delete branding" ON storage.objects;
CREATE POLICY "Users can delete branding"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'branding' AND
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Public can read branding files (for Trust Center)
DROP POLICY IF EXISTS "Public can read branding" ON storage.objects;
CREATE POLICY "Public can read branding"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'branding');

-- ============================================================================
-- PART 17: HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's current organization
CREATE OR REPLACE FUNCTION get_user_default_org(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id
  FROM organization_members
  WHERE user_id = p_user_id AND is_default = true
  LIMIT 1;

  -- If no default, return first org
  IF v_org_id IS NULL THEN
    SELECT organization_id INTO v_org_id
    FROM organization_members
    WHERE user_id = p_user_id
    ORDER BY joined_at ASC
    LIMIT 1;
  END IF;

  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate trust center token
CREATE OR REPLACE FUNCTION validate_trust_center_token(p_slug TEXT, p_token TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  organization_id UUID,
  organization_name TEXT,
  logo_url TEXT,
  primary_color TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN t.id IS NOT NULL
           AND t.is_active = true
           AND (t.expires_at IS NULL OR t.expires_at > NOW())
      THEN true
      ELSE false
    END as is_valid,
    o.id as organization_id,
    o.name as organization_name,
    o.logo_url,
    o.primary_color
  FROM organizations o
  LEFT JOIN trust_center_tokens t ON t.organization_id = o.id AND t.token = p_token
  WHERE o.slug = p_slug;

  -- Update view count if valid
  UPDATE trust_center_tokens
  SET view_count = view_count + 1, last_viewed_at = NOW()
  WHERE token = p_token AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept invite
CREATE OR REPLACE FUNCTION accept_organization_invite(p_token TEXT, p_user_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  organization_id UUID,
  message TEXT
) AS $$
DECLARE
  v_invite organization_invites%ROWTYPE;
BEGIN
  -- Get invite
  SELECT * INTO v_invite
  FROM organization_invites
  WHERE token = p_token AND accepted_at IS NULL;

  IF v_invite.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Invalid or already used invite';
    RETURN;
  END IF;

  IF v_invite.expires_at < NOW() THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Invite has expired';
    RETURN;
  END IF;

  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = v_invite.organization_id AND user_id = p_user_id
  ) THEN
    RETURN QUERY SELECT false, v_invite.organization_id, 'Already a member of this organization';
    RETURN;
  END IF;

  -- Add membership
  INSERT INTO organization_members (organization_id, user_id, role, is_default)
  VALUES (v_invite.organization_id, p_user_id, v_invite.role, false);

  -- Mark invite as accepted
  UPDATE organization_invites
  SET accepted_at = NOW()
  WHERE id = v_invite.id;

  RETURN QUERY SELECT true, v_invite.organization_id, 'Successfully joined organization';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
