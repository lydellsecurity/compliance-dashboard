-- ============================================================================
-- Report History Table for Report & Analytics Center
-- ============================================================================
-- This migration creates the report_history table for version control of
-- generated reports, supporting the new Report & Analytics Center feature.
-- ============================================================================

-- Create report_artifacts table (main report storage)
CREATE TABLE IF NOT EXISTS report_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Report metadata
    category TEXT NOT NULL CHECK (category IN ('executive', 'gap', 'framework', 'inventory')),
    title TEXT NOT NULL,
    description TEXT,
    framework_id TEXT, -- NULL for cross-framework reports

    -- Version control
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'archived')),

    -- File info
    file_path TEXT, -- Supabase Storage path
    file_size_bytes BIGINT,
    file_mime_type TEXT DEFAULT 'application/pdf',

    -- Digital signature
    sha256_hash TEXT, -- For integrity verification
    signed_at TIMESTAMPTZ,
    signed_by UUID REFERENCES auth.users(id),

    -- Audit fields
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    generated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create report_history table (version history)
CREATE TABLE IF NOT EXISTS report_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES report_artifacts(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Version info
    version INTEGER NOT NULL,
    changes TEXT, -- Description of changes from previous version

    -- Snapshot data
    file_path TEXT, -- Path to archived version
    file_size_bytes BIGINT,
    sha256_hash TEXT,

    -- Metadata at time of version
    metadata JSONB DEFAULT '{}',

    -- Audit fields
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    generated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create audit_bundles table (for one-click audit bundles)
CREATE TABLE IF NOT EXISTS audit_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Bundle metadata
    title TEXT NOT NULL,
    description TEXT,

    -- Included items (JSON array of report_artifact IDs and evidence IDs)
    included_reports UUID[] DEFAULT '{}',
    included_evidence UUID[] DEFAULT '{}',
    included_frameworks TEXT[] DEFAULT '{}',

    -- File info
    file_path TEXT, -- Path to ZIP bundle
    file_size_bytes BIGINT,
    sha256_hash TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'failed', 'expired')),
    error_message TEXT,
    expires_at TIMESTAMPTZ,

    -- Audit fields
    generated_at TIMESTAMPTZ,
    generated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_report_artifacts_org_id ON report_artifacts(org_id);
CREATE INDEX IF NOT EXISTS idx_report_artifacts_category ON report_artifacts(category);
CREATE INDEX IF NOT EXISTS idx_report_artifacts_framework_id ON report_artifacts(framework_id);
CREATE INDEX IF NOT EXISTS idx_report_artifacts_status ON report_artifacts(status);
CREATE INDEX IF NOT EXISTS idx_report_artifacts_generated_at ON report_artifacts(generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_history_report_id ON report_history(report_id);
CREATE INDEX IF NOT EXISTS idx_report_history_org_id ON report_history(org_id);
CREATE INDEX IF NOT EXISTS idx_report_history_version ON report_history(report_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_audit_bundles_org_id ON audit_bundles(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_bundles_status ON audit_bundles(status);
CREATE INDEX IF NOT EXISTS idx_audit_bundles_created_at ON audit_bundles(created_at DESC);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE report_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_bundles ENABLE ROW LEVEL SECURITY;

-- Report artifacts policies
CREATE POLICY "Users can view reports in their organization"
    ON report_artifacts FOR SELECT
    USING (
        org_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create reports in their organization"
    ON report_artifacts FOR INSERT
    WITH CHECK (
        org_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update reports in their organization"
    ON report_artifacts FOR UPDATE
    USING (
        org_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can delete reports in their organization"
    ON report_artifacts FOR DELETE
    USING (
        org_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Report history policies
CREATE POLICY "Users can view report history in their organization"
    ON report_history FOR SELECT
    USING (
        org_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create report history in their organization"
    ON report_history FOR INSERT
    WITH CHECK (
        org_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Audit bundles policies
CREATE POLICY "Users can view audit bundles in their organization"
    ON audit_bundles FOR SELECT
    USING (
        org_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create audit bundles in their organization"
    ON audit_bundles FOR INSERT
    WITH CHECK (
        org_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update audit bundles in their organization"
    ON audit_bundles FOR UPDATE
    USING (
        org_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_report_artifacts_updated_at
    BEFORE UPDATE ON report_artifacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audit_bundles_updated_at
    BEFORE UPDATE ON audit_bundles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function to auto-create history entry on version update
-- ============================================================================

CREATE OR REPLACE FUNCTION create_report_version_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create history if version changed
    IF OLD.version IS DISTINCT FROM NEW.version THEN
        INSERT INTO report_history (
            report_id,
            org_id,
            version,
            changes,
            file_path,
            file_size_bytes,
            sha256_hash,
            metadata,
            generated_at,
            generated_by
        ) VALUES (
            OLD.id,
            OLD.org_id,
            OLD.version,
            'Version ' || OLD.version || ' archived',
            OLD.file_path,
            OLD.file_size_bytes,
            OLD.sha256_hash,
            jsonb_build_object(
                'title', OLD.title,
                'description', OLD.description,
                'status', OLD.status,
                'framework_id', OLD.framework_id
            ),
            OLD.generated_at,
            OLD.generated_by
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_report_history
    BEFORE UPDATE ON report_artifacts
    FOR EACH ROW
    EXECUTE FUNCTION create_report_version_history();

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE report_artifacts IS 'Stores generated compliance reports with version control';
COMMENT ON TABLE report_history IS 'Maintains version history for report artifacts';
COMMENT ON TABLE audit_bundles IS 'Stores one-click audit bundle packages';

COMMENT ON COLUMN report_artifacts.sha256_hash IS 'SHA-256 hash for document integrity verification';
COMMENT ON COLUMN report_artifacts.category IS 'Report type: executive, gap, framework, or inventory';
COMMENT ON COLUMN audit_bundles.included_reports IS 'Array of report_artifact UUIDs included in bundle';
