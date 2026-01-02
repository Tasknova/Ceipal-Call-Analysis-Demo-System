-- =====================================================
-- Call Analysis Database Schema
-- Generated: January 2, 2026
-- Description: Complete database schema for Call Analysis Platform
-- Note: This file contains only the structure (no data)
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: user_profiles
-- Description: User account information and settings
-- =====================================================

CREATE TABLE public.user_profiles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    avatar_url text,
    company_name text,
    company_email text,
    company_industry text,
    position text,
    use_cases text[],
    onboarding_completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- TABLE: lead_groups
-- Description: Lead grouping and segmentation
-- =====================================================

CREATE TABLE public.lead_groups (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    group_name character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- TABLE: leads
-- Description: Lead contact information and management
-- =====================================================

CREATE TABLE public.leads (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    group_id uuid,
    name character varying NOT NULL,
    email character varying NOT NULL,
    contact character varying NOT NULL,
    description text,
    other jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    lead_type text,
    project text
);

-- =====================================================
-- TABLE: recordings
-- Description: Audio recording storage and metadata
-- =====================================================

CREATE TABLE public.recordings (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    file_name text,
    file_size bigint,
    stored_file_url text,
    duration_seconds integer,
    transcript text,
    created_at timestamp without time zone DEFAULT now(),
    lead_id uuid,
    call_date timestamp with time zone
);

-- =====================================================
-- TABLE: analyses
-- Description: AI analysis results and metrics
-- =====================================================

CREATE TABLE public.analyses (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    recording_id uuid,
    user_id uuid NOT NULL,
    status character varying DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    participants jsonb,
    lead_type text,
    sentiments_score numeric,
    engagement_score numeric,
    confidence_score_executive numeric,
    confidence_score_person numeric,
    objections_handeled text,
    next_steps text,
    improvements text,
    call_outcome text,
    short_summary text,
    lead_type_explanation text,
    sentiments_explanation text,
    engagement_explanation text,
    confidence_explanation_executive text,
    confidence_explanation_person text,
    objections_detected text,
    objections_handling_details text,
    next_steps_detailed text,
    improvements_for_team text,
    call_outcome_rationale text,
    evidence_quotes text,
    no_of_objections_detected integer,
    no_of_objections_handeled integer
);

-- =====================================================
-- TABLE: metrics_aggregates
-- Description: Aggregated performance metrics
-- =====================================================

CREATE TABLE public.metrics_aggregates (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    date date NOT NULL,
    total_calls integer,
    avg_sentiment numeric,
    avg_engagement numeric,
    conversion_rate numeric,
    objections_rate numeric
);

-- =====================================================
-- PRIMARY KEY CONSTRAINTS
-- =====================================================

ALTER TABLE public.user_profiles ADD PRIMARY KEY (id);
ALTER TABLE public.lead_groups ADD PRIMARY KEY (id);
ALTER TABLE public.leads ADD PRIMARY KEY (id);
ALTER TABLE public.recordings ADD PRIMARY KEY (id);
ALTER TABLE public.analyses ADD PRIMARY KEY (id);
ALTER TABLE public.metrics_aggregates ADD PRIMARY KEY (id);

-- =====================================================
-- UNIQUE CONSTRAINTS
-- =====================================================

ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);

-- =====================================================
-- FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Lead groups reference
ALTER TABLE public.leads 
    ADD CONSTRAINT leads_group_id_fkey 
    FOREIGN KEY (group_id) 
    REFERENCES public.lead_groups (id);

-- Recordings reference leads
ALTER TABLE public.recordings 
    ADD CONSTRAINT recordings_lead_id_fkey 
    FOREIGN KEY (lead_id) 
    REFERENCES public.leads (id);

-- Analyses reference recordings
ALTER TABLE public.analyses 
    ADD CONSTRAINT analyses_recording_id_fkey 
    FOREIGN KEY (recording_id) 
    REFERENCES public.recordings (id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on metrics_aggregates table
ALTER TABLE public.metrics_aggregates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- INDEXES (Optional - Add if needed for performance)
-- =====================================================

-- Index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_groups_user_id ON public.lead_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_group_id ON public.leads(group_id);
CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON public.recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_lead_id ON public.recordings(lead_id);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_recording_id ON public.analyses(recording_id);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON public.analyses(status);
CREATE INDEX IF NOT EXISTS idx_metrics_aggregates_user_id ON public.metrics_aggregates(user_id);
CREATE INDEX IF NOT EXISTS idx_metrics_aggregates_date ON public.metrics_aggregates(date);

-- Index on created_at for chronological queries
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON public.recordings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses(created_at DESC);

-- =====================================================
-- COMMENTS ON COLUMNS
-- =====================================================

COMMENT ON COLUMN public.recordings.lead_id IS 'Foreign key reference to the lead associated with this recording';
COMMENT ON COLUMN public.recordings.call_date IS 'The date and time when the call actually took place (as provided by user)';

-- =====================================================
-- END OF SCHEMA
-- =====================================================
