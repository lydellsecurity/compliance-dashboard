-- Migration: Create questionnaire tables for Security Questionnaire Automation
-- Created: 2026-01-17
-- Description: Tables for AI-powered security questionnaire automation
--              Supports SIG, CAIQ, VSA, HECVAT, and custom questionnaire formats

-- ============================================================================
-- CREATE questionnaires TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    template_id TEXT,
    format TEXT NOT NULL CHECK (format IN ('SIG', 'SIG_LITE', 'CAIQ', 'VSA', 'HECVAT', 'CUSTOM')),
    name TEXT NOT NULL,
    description TEXT,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    due_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'submitted', 'archived')),
    progress_total INTEGER NOT NULL DEFAULT 0,
    progress_answered INTEGER NOT NULL DEFAULT 0,
    progress_approved INTEGER NOT NULL DEFAULT 0,
    progress_flagged INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes for questionnaires
CREATE INDEX IF NOT EXISTS idx_questionnaires_org_id ON public.questionnaires(organization_id);
CREATE INDEX IF NOT EXISTS idx_questionnaires_status ON public.questionnaires(status);
CREATE INDEX IF NOT EXISTS idx_questionnaires_format ON public.questionnaires(format);
CREATE INDEX IF NOT EXISTS idx_questionnaires_customer ON public.questionnaires(customer_name);
CREATE INDEX IF NOT EXISTS idx_questionnaires_due_date ON public.questionnaires(due_date);

-- ============================================================================
-- CREATE questionnaire_categories TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.questionnaire_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    questionnaire_id UUID NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    question_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_categories_questionnaire ON public.questionnaire_categories(questionnaire_id);

-- ============================================================================
-- CREATE questionnaire_questions TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.questionnaire_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    questionnaire_id UUID NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.questionnaire_categories(id) ON DELETE SET NULL,
    category_name TEXT,
    question_number TEXT NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'text' CHECK (question_type IN ('yes_no', 'multiple_choice', 'text', 'date', 'file_upload')),
    options JSONB,
    required BOOLEAN NOT NULL DEFAULT true,
    help_text TEXT,
    related_controls TEXT[] DEFAULT '{}',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for questionnaire_questions
CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_questionnaire ON public.questionnaire_questions(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_category ON public.questionnaire_questions(category_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_questions_number ON public.questionnaire_questions(question_number);

-- ============================================================================
-- CREATE questionnaire_answers TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.questionnaire_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    questionnaire_id UUID NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questionnaire_questions(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ai_suggested', 'reviewed', 'approved', 'flagged')),
    answer TEXT,
    ai_suggested_answer TEXT,
    ai_confidence TEXT CHECK (ai_confidence IN ('high', 'medium', 'low')),
    ai_reasoning TEXT,
    evidence_urls TEXT[] DEFAULT '{}',
    evidence_notes TEXT,
    related_control_ids TEXT[] DEFAULT '{}',
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    flag_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for questionnaire_answers
CREATE INDEX IF NOT EXISTS idx_questionnaire_answers_questionnaire ON public.questionnaire_answers(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_answers_question ON public.questionnaire_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_answers_status ON public.questionnaire_answers(status);

-- Unique constraint to ensure one answer per question
CREATE UNIQUE INDEX IF NOT EXISTS idx_questionnaire_answers_unique
    ON public.questionnaire_answers(questionnaire_id, question_id);

-- ============================================================================
-- CREATE question_library TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.question_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    normalized_question TEXT NOT NULL,
    standard_answer TEXT NOT NULL,
    answer_type TEXT NOT NULL DEFAULT 'text' CHECK (answer_type IN ('yes_no', 'text', 'multiple_choice')),
    related_controls TEXT[] DEFAULT '{}',
    evidence_references TEXT[] DEFAULT '{}',
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    usage_count INTEGER NOT NULL DEFAULT 0,
    last_used TIMESTAMPTZ,
    confidence TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id)
);

-- Indexes for question_library
CREATE INDEX IF NOT EXISTS idx_question_library_org_id ON public.question_library(organization_id);
CREATE INDEX IF NOT EXISTS idx_question_library_category ON public.question_library(category);
CREATE INDEX IF NOT EXISTS idx_question_library_confidence ON public.question_library(confidence);
CREATE INDEX IF NOT EXISTS idx_question_library_usage ON public.question_library(usage_count DESC);

-- Full-text search index for question matching
CREATE INDEX IF NOT EXISTS idx_question_library_question_text
    ON public.question_library USING gin(to_tsvector('english', question_text));
CREATE INDEX IF NOT EXISTS idx_question_library_normalized
    ON public.question_library USING gin(to_tsvector('english', normalized_question));

-- ============================================================================
-- CREATE questionnaire_templates TABLE (for built-in and custom templates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.questionnaire_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    format TEXT NOT NULL CHECK (format IN ('SIG', 'SIG_LITE', 'CAIQ', 'VSA', 'HECVAT', 'CUSTOM')),
    name TEXT NOT NULL,
    description TEXT,
    version TEXT NOT NULL DEFAULT '1.0',
    total_questions INTEGER NOT NULL DEFAULT 0,
    categories TEXT[] DEFAULT '{}',
    is_built_in BOOLEAN NOT NULL DEFAULT false,
    template_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for questionnaire_templates
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_org_id ON public.questionnaire_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_format ON public.questionnaire_templates(format);
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_built_in ON public.questionnaire_templates(is_built_in);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR questionnaires
-- ============================================================================

CREATE POLICY "questionnaires_select" ON public.questionnaires
    FOR SELECT USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "questionnaires_insert" ON public.questionnaires
    FOR INSERT WITH CHECK (public.user_belongs_to_org(organization_id));

CREATE POLICY "questionnaires_update" ON public.questionnaires
    FOR UPDATE USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "questionnaires_delete" ON public.questionnaires
    FOR DELETE USING (public.user_belongs_to_org(organization_id));

-- ============================================================================
-- RLS POLICIES FOR questionnaire_categories
-- ============================================================================

CREATE POLICY "questionnaire_categories_select" ON public.questionnaire_categories
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.questionnaires q
            WHERE q.id = questionnaire_id
            AND public.user_belongs_to_org(q.organization_id)
        )
    );

CREATE POLICY "questionnaire_categories_insert" ON public.questionnaire_categories
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.questionnaires q
            WHERE q.id = questionnaire_id
            AND public.user_belongs_to_org(q.organization_id)
        )
    );

CREATE POLICY "questionnaire_categories_update" ON public.questionnaire_categories
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.questionnaires q
            WHERE q.id = questionnaire_id
            AND public.user_belongs_to_org(q.organization_id)
        )
    );

CREATE POLICY "questionnaire_categories_delete" ON public.questionnaire_categories
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.questionnaires q
            WHERE q.id = questionnaire_id
            AND public.user_belongs_to_org(q.organization_id)
        )
    );

-- ============================================================================
-- RLS POLICIES FOR questionnaire_questions
-- ============================================================================

CREATE POLICY "questionnaire_questions_select" ON public.questionnaire_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.questionnaires q
            WHERE q.id = questionnaire_id
            AND public.user_belongs_to_org(q.organization_id)
        )
    );

CREATE POLICY "questionnaire_questions_insert" ON public.questionnaire_questions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.questionnaires q
            WHERE q.id = questionnaire_id
            AND public.user_belongs_to_org(q.organization_id)
        )
    );

CREATE POLICY "questionnaire_questions_update" ON public.questionnaire_questions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.questionnaires q
            WHERE q.id = questionnaire_id
            AND public.user_belongs_to_org(q.organization_id)
        )
    );

CREATE POLICY "questionnaire_questions_delete" ON public.questionnaire_questions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.questionnaires q
            WHERE q.id = questionnaire_id
            AND public.user_belongs_to_org(q.organization_id)
        )
    );

-- ============================================================================
-- RLS POLICIES FOR questionnaire_answers
-- ============================================================================

CREATE POLICY "questionnaire_answers_select" ON public.questionnaire_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.questionnaires q
            WHERE q.id = questionnaire_id
            AND public.user_belongs_to_org(q.organization_id)
        )
    );

CREATE POLICY "questionnaire_answers_insert" ON public.questionnaire_answers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.questionnaires q
            WHERE q.id = questionnaire_id
            AND public.user_belongs_to_org(q.organization_id)
        )
    );

CREATE POLICY "questionnaire_answers_update" ON public.questionnaire_answers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.questionnaires q
            WHERE q.id = questionnaire_id
            AND public.user_belongs_to_org(q.organization_id)
        )
    );

CREATE POLICY "questionnaire_answers_delete" ON public.questionnaire_answers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.questionnaires q
            WHERE q.id = questionnaire_id
            AND public.user_belongs_to_org(q.organization_id)
        )
    );

-- ============================================================================
-- RLS POLICIES FOR question_library
-- ============================================================================

CREATE POLICY "question_library_select" ON public.question_library
    FOR SELECT USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "question_library_insert" ON public.question_library
    FOR INSERT WITH CHECK (public.user_belongs_to_org(organization_id));

CREATE POLICY "question_library_update" ON public.question_library
    FOR UPDATE USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "question_library_delete" ON public.question_library
    FOR DELETE USING (public.user_belongs_to_org(organization_id));

-- ============================================================================
-- RLS POLICIES FOR questionnaire_templates
-- ============================================================================

-- Templates can be viewed if built-in OR belong to user's org
CREATE POLICY "questionnaire_templates_select" ON public.questionnaire_templates
    FOR SELECT USING (
        is_built_in = true
        OR (organization_id IS NOT NULL AND public.user_belongs_to_org(organization_id))
    );

CREATE POLICY "questionnaire_templates_insert" ON public.questionnaire_templates
    FOR INSERT WITH CHECK (
        organization_id IS NOT NULL AND public.user_belongs_to_org(organization_id)
    );

CREATE POLICY "questionnaire_templates_update" ON public.questionnaire_templates
    FOR UPDATE USING (
        organization_id IS NOT NULL AND public.user_belongs_to_org(organization_id)
    );

CREATE POLICY "questionnaire_templates_delete" ON public.questionnaire_templates
    FOR DELETE USING (
        organization_id IS NOT NULL AND public.user_belongs_to_org(organization_id)
    );

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================

CREATE TRIGGER update_questionnaires_updated_at
    BEFORE UPDATE ON public.questionnaires
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questionnaire_answers_updated_at
    BEFORE UPDATE ON public.questionnaire_answers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_library_updated_at
    BEFORE UPDATE ON public.question_library
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questionnaire_templates_updated_at
    BEFORE UPDATE ON public.questionnaire_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION TO UPDATE QUESTIONNAIRE PROGRESS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_questionnaire_progress()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.questionnaires
    SET
        progress_answered = (
            SELECT COUNT(*) FROM public.questionnaire_answers
            WHERE questionnaire_id = NEW.questionnaire_id
            AND answer IS NOT NULL AND answer != ''
        ),
        progress_approved = (
            SELECT COUNT(*) FROM public.questionnaire_answers
            WHERE questionnaire_id = NEW.questionnaire_id
            AND status = 'approved'
        ),
        progress_flagged = (
            SELECT COUNT(*) FROM public.questionnaire_answers
            WHERE questionnaire_id = NEW.questionnaire_id
            AND status = 'flagged'
        ),
        updated_at = now()
    WHERE id = NEW.questionnaire_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_questionnaire_progress_on_answer
    AFTER INSERT OR UPDATE ON public.questionnaire_answers
    FOR EACH ROW EXECUTE FUNCTION update_questionnaire_progress();

-- ============================================================================
-- FUNCTION TO INCREMENT QUESTION LIBRARY USAGE
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_library_usage(library_item_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.question_library
    SET
        usage_count = usage_count + 1,
        last_used = now()
    WHERE id = library_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INSERT BUILT-IN TEMPLATES
-- ============================================================================

INSERT INTO public.questionnaire_templates (id, format, name, description, version, total_questions, categories, is_built_in)
VALUES
    (gen_random_uuid(), 'SIG', 'Standardized Information Gathering (SIG)', 'Comprehensive third-party risk assessment questionnaire from Shared Assessments', '2024', 850, ARRAY['A. Enterprise Risk Management', 'B. Security Policy', 'C. Organizational Security', 'D. Asset and Info Management', 'E. Human Resources Security', 'F. Physical and Environmental', 'G. IT Operations Management', 'H. Access Control', 'I. Application Security', 'J. Incident Management', 'K. Operational Resilience', 'L. Compliance and Ops Risk', 'M. Endpoint Security', 'N. Network Security', 'O. Privacy', 'P. Threat Management', 'Q. Server Security', 'R. Cloud Hosting', 'S. Electronic and Physical Media', 'T. Mobile Application Security'], true),
    (gen_random_uuid(), 'SIG_LITE', 'SIG Lite', 'Streamlined version of SIG for lower-risk assessments', '2024', 150, ARRAY['Security Policy', 'Risk Management', 'Access Control', 'Data Protection', 'Incident Response', 'Business Continuity', 'Compliance'], true),
    (gen_random_uuid(), 'CAIQ', 'Consensus Assessments Initiative Questionnaire (CAIQ)', 'Cloud Security Alliance questionnaire for cloud service providers', 'v4.0', 261, ARRAY['Audit Assurance & Compliance', 'Application & Interface Security', 'Business Continuity Management', 'Change Control & Configuration', 'Data Security & Privacy', 'Datacenter Security', 'Encryption & Key Management', 'Governance and Risk Management', 'Human Resources Security', 'Identity & Access Management', 'Infrastructure & Virtualization', 'Interoperability & Portability', 'Mobile Security', 'Security Incident Management', 'Supply Chain Management', 'Threat and Vulnerability Management', 'Universal Endpoint Management'], true),
    (gen_random_uuid(), 'VSA', 'Vendor Security Alliance Questionnaire (VSA)', 'Standardized vendor security assessment', '6.0', 267, ARRAY['Data Protection', 'Information Security', 'Policies and Procedures', 'Preventive Controls', 'Detective Controls', 'Vendor Management', 'Resiliency'], true),
    (gen_random_uuid(), 'HECVAT', 'Higher Education Community Vendor Assessment Tool', 'Security assessment for higher education vendors', '3.0', 180, ARRAY['Documentation', 'Company Information', 'Qualitative Risk Analysis', 'IT Security', 'Datacenter', 'Data', 'Access', 'Application', 'Health'], true)
ON CONFLICT DO NOTHING;
