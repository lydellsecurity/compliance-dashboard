-- ============================================================================
-- Enhanced Vendors Schema for TPRM Center
-- ============================================================================
-- This migration enhances the vendors table with additional fields for:
-- - Security artifacts tracking
-- - Renewal notifications
-- - Assessment scheduling
-- ============================================================================

-- Add new columns to vendors table (if they don't exist)
DO $$
BEGIN
    -- Risk tier column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'risk_tier') THEN
        ALTER TABLE vendors ADD COLUMN risk_tier TEXT CHECK (risk_tier IN ('tier1', 'tier2', 'tier3', 'tier4'));
    END IF;

    -- Last assessment date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'last_assessment_at') THEN
        ALTER TABLE vendors ADD COLUMN last_assessment_at TIMESTAMPTZ;
    END IF;

    -- Next assessment date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'next_assessment_at') THEN
        ALTER TABLE vendors ADD COLUMN next_assessment_at TIMESTAMPTZ;
    END IF;

    -- Contract value
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'contract_value') THEN
        ALTER TABLE vendors ADD COLUMN contract_value NUMERIC(15, 2);
    END IF;

    -- Auto renewal flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'auto_renewal') THEN
        ALTER TABLE vendors ADD COLUMN auto_renewal BOOLEAN DEFAULT false;
    END IF;

    -- Data classification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'data_classification') THEN
        ALTER TABLE vendors ADD COLUMN data_classification TEXT DEFAULT 'internal' CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted'));
    END IF;
END $$;

-- ============================================================================
-- Security Artifacts Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_security_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Artifact metadata
    artifact_type TEXT NOT NULL CHECK (artifact_type IN ('soc2', 'iso27001', 'privacy_policy', 'pentest', 'bcp', 'other')),
    title TEXT NOT NULL,
    description TEXT,

    -- File info
    file_name TEXT NOT NULL,
    file_path TEXT, -- Supabase Storage path
    file_size_bytes BIGINT,
    file_mime_type TEXT DEFAULT 'application/pdf',

    -- Validity
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'expiring_soon', 'expired', 'archived')),

    -- Audit fields
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Vendor Risk Assessments Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_inherent_risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Risk factors (0-25 each)
    data_access_score INTEGER NOT NULL DEFAULT 0 CHECK (data_access_score BETWEEN 0 AND 25),
    system_access_score INTEGER NOT NULL DEFAULT 0 CHECK (system_access_score BETWEEN 0 AND 25),
    business_criticality_score INTEGER NOT NULL DEFAULT 0 CHECK (business_criticality_score BETWEEN 0 AND 25),
    data_volume_score INTEGER NOT NULL DEFAULT 0 CHECK (data_volume_score BETWEEN 0 AND 25),
    geographic_risk_score INTEGER NOT NULL DEFAULT 0 CHECK (geographic_risk_score BETWEEN 0 AND 15),

    -- Calculated scores
    total_score INTEGER NOT NULL,
    risk_tier TEXT NOT NULL CHECK (risk_tier IN ('tier1', 'tier2', 'tier3', 'tier4')),

    -- Raw responses (JSON for flexibility)
    responses JSONB DEFAULT '{}',

    -- Audit fields
    assessed_by UUID REFERENCES auth.users(id),
    assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Renewal Notifications Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_renewal_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Notification settings
    notification_type TEXT NOT NULL CHECK (notification_type IN ('contract_expiry', 'assessment_due', 'artifact_expiry')),
    days_before INTEGER NOT NULL DEFAULT 30,
    enabled BOOLEAN NOT NULL DEFAULT true,

    -- Notification state
    last_sent_at TIMESTAMPTZ,
    next_due_at TIMESTAMPTZ,

    -- Target
    target_date TIMESTAMPTZ NOT NULL,

    -- Recipient preferences
    email_recipients TEXT[] DEFAULT '{}',
    slack_channel TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- AI Vendor Review Results
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_ai_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Source document
    source_file_name TEXT NOT NULL,
    source_file_path TEXT,
    source_file_size BIGINT,

    -- Analysis results
    overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
    category_scores JSONB NOT NULL DEFAULT '{}',
    risks JSONB NOT NULL DEFAULT '[]',
    recommendations JSONB NOT NULL DEFAULT '[]',

    -- Analysis metadata
    model_version TEXT,
    analysis_duration_ms INTEGER,

    -- Audit fields
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    analyzed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_vendor_artifacts_vendor_id ON vendor_security_artifacts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_artifacts_org_id ON vendor_security_artifacts(org_id);
CREATE INDEX IF NOT EXISTS idx_vendor_artifacts_type ON vendor_security_artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_vendor_artifacts_status ON vendor_security_artifacts(status);
CREATE INDEX IF NOT EXISTS idx_vendor_artifacts_valid_until ON vendor_security_artifacts(valid_until);

CREATE INDEX IF NOT EXISTS idx_vendor_risk_assessments_vendor_id ON vendor_inherent_risk_assessments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_risk_assessments_org_id ON vendor_inherent_risk_assessments(org_id);
CREATE INDEX IF NOT EXISTS idx_vendor_risk_assessments_assessed_at ON vendor_inherent_risk_assessments(assessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_vendor_notifications_vendor_id ON vendor_renewal_notifications(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_notifications_org_id ON vendor_renewal_notifications(org_id);
CREATE INDEX IF NOT EXISTS idx_vendor_notifications_next_due ON vendor_renewal_notifications(next_due_at);

CREATE INDEX IF NOT EXISTS idx_vendor_ai_reviews_org_id ON vendor_ai_reviews(org_id);
CREATE INDEX IF NOT EXISTS idx_vendor_ai_reviews_vendor_id ON vendor_ai_reviews(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_ai_reviews_analyzed_at ON vendor_ai_reviews(analyzed_at DESC);

-- Index for vendors contract expiry tracking
CREATE INDEX IF NOT EXISTS idx_vendors_contract_end_date ON vendors(contract_end_date);
CREATE INDEX IF NOT EXISTS idx_vendors_next_assessment ON vendors(next_assessment_at);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE vendor_security_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_inherent_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_renewal_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_ai_reviews ENABLE ROW LEVEL SECURITY;

-- Security Artifacts Policies
CREATE POLICY "Users can view artifacts in their organization"
    ON vendor_security_artifacts FOR SELECT
    USING (org_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create artifacts in their organization"
    ON vendor_security_artifacts FOR INSERT
    WITH CHECK (org_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update artifacts in their organization"
    ON vendor_security_artifacts FOR UPDATE
    USING (org_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete artifacts in their organization"
    ON vendor_security_artifacts FOR DELETE
    USING (org_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- Risk Assessments Policies
CREATE POLICY "Users can view risk assessments in their organization"
    ON vendor_inherent_risk_assessments FOR SELECT
    USING (org_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create risk assessments in their organization"
    ON vendor_inherent_risk_assessments FOR INSERT
    WITH CHECK (org_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- Renewal Notifications Policies
CREATE POLICY "Users can view notifications in their organization"
    ON vendor_renewal_notifications FOR SELECT
    USING (org_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage notifications in their organization"
    ON vendor_renewal_notifications FOR ALL
    USING (org_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- AI Reviews Policies
CREATE POLICY "Users can view AI reviews in their organization"
    ON vendor_ai_reviews FOR SELECT
    USING (org_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create AI reviews in their organization"
    ON vendor_ai_reviews FOR INSERT
    WITH CHECK (org_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

CREATE TRIGGER update_vendor_artifacts_updated_at
    BEFORE UPDATE ON vendor_security_artifacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_notifications_updated_at
    BEFORE UPDATE ON vendor_renewal_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function to auto-update artifact status based on validity dates
-- ============================================================================

CREATE OR REPLACE FUNCTION update_artifact_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.valid_until IS NOT NULL THEN
        IF NEW.valid_until < NOW() THEN
            NEW.status := 'expired';
        ELSIF NEW.valid_until < NOW() + INTERVAL '30 days' THEN
            NEW.status := 'expiring_soon';
        ELSE
            NEW.status := 'valid';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_update_artifact_status
    BEFORE INSERT OR UPDATE ON vendor_security_artifacts
    FOR EACH ROW
    EXECUTE FUNCTION update_artifact_status();

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE vendor_security_artifacts IS 'Stores vendor security documents (SOC 2, ISO, etc.)';
COMMENT ON TABLE vendor_inherent_risk_assessments IS 'Stores inherent risk assessment results from 5-question questionnaire';
COMMENT ON TABLE vendor_renewal_notifications IS 'Manages automated renewal and assessment reminder notifications';
COMMENT ON TABLE vendor_ai_reviews IS 'Stores AI-powered policy analysis results';

COMMENT ON COLUMN vendor_inherent_risk_assessments.risk_tier IS 'tier1=Critical/Quarterly, tier2=High/Semi-annual, tier3=Medium/Annual, tier4=Low/Bi-annual';
