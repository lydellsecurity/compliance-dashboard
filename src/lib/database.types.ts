/**
 * Supabase Database Types
 * 
 * Types matching the Compliance Engine database schema.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AnswerType = 'yes' | 'no' | 'partial' | 'na';
export type EvidenceStatus = 'draft' | 'review' | 'final';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type FrameworkId = 'SOC2' | 'ISO27001' | 'HIPAA' | 'NIST' | 'PCIDSS' | 'GDPR';
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          primary_color: string;
          contact_email: string | null;
          description: string | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          primary_color?: string;
          contact_email?: string | null;
          description?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          primary_color?: string;
          contact_email?: string | null;
          description?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string | null;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id?: string | null;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      control_responses: {
        Row: {
          id: string;
          organization_id: string;
          control_id: string;
          answer: AnswerType | null;
          evidence_id: string | null;
          remediation_plan: string;
          answered_at: string;
          answered_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          control_id: string;
          answer?: AnswerType | null;
          evidence_id?: string | null;
          remediation_plan?: string;
          answered_at?: string;
          answered_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          control_id?: string;
          answer?: AnswerType | null;
          evidence_id?: string | null;
          remediation_plan?: string;
          answered_at?: string;
          answered_by?: string | null;
          updated_at?: string;
        };
      };
      evidence_records: {
        Row: {
          id: string;
          organization_id: string;
          control_response_id: string | null;
          control_id: string;
          notes: string;
          status: EvidenceStatus;
          file_urls: string[];
          created_at: string;
          updated_at: string;
          reviewed_by: string | null;
          approved_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          control_response_id?: string | null;
          control_id: string;
          notes?: string;
          status?: EvidenceStatus;
          file_urls?: string[];
          created_at?: string;
          updated_at?: string;
          reviewed_by?: string | null;
          approved_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          control_response_id?: string | null;
          control_id?: string;
          notes?: string;
          status?: EvidenceStatus;
          file_urls?: string[];
          created_at?: string;
          updated_at?: string;
          reviewed_by?: string | null;
          approved_at?: string | null;
        };
      };
      custom_controls: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          description: string;
          question: string;
          category: string;
          risk_level: RiskLevel;
          is_active: boolean;
          created_at: string;
          created_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          description: string;
          question: string;
          category: string;
          risk_level?: RiskLevel;
          is_active?: boolean;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          title?: string;
          description?: string;
          question?: string;
          category?: string;
          risk_level?: RiskLevel;
          is_active?: boolean;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string;
        };
      };
      framework_mappings: {
        Row: {
          id: string;
          custom_control_id: string;
          framework_id: FrameworkId;
          clause_id: string;
          clause_title: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          custom_control_id: string;
          framework_id: FrameworkId;
          clause_id: string;
          clause_title: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          custom_control_id?: string;
          framework_id?: FrameworkId;
          clause_id?: string;
          clause_title?: string;
          created_at?: string;
        };
      };
      audit_log: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          old_value: Json | null;
          new_value: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          old_value?: Json | null;
          new_value?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          old_value?: Json | null;
          new_value?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      trust_center_tokens: {
        Row: {
          id: string;
          organization_id: string;
          token: string;
          name: string | null;
          expires_at: string | null;
          is_active: boolean;
          view_count: number;
          last_viewed_at: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          token: string;
          name?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          view_count?: number;
          last_viewed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          token?: string;
          name?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          view_count?: number;
          last_viewed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
      };
      organization_invites: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: UserRole;
          token: string;
          invited_by: string | null;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email: string;
          role?: UserRole;
          token: string;
          invited_by?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          email?: string;
          role?: UserRole;
          token?: string;
          invited_by?: string | null;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: UserRole;
          is_default: boolean;
          joined_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: UserRole;
          is_default?: boolean;
          joined_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: UserRole;
          is_default?: boolean;
          joined_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      answer_type: AnswerType;
      evidence_status: EvidenceStatus;
      risk_level: RiskLevel;
      framework_id: FrameworkId;
      user_role: UserRole;
    };
  };
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row'];

export type InsertTables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Insert'];

export type UpdateTables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Update'];

// Convenience type aliases
export type Organization = Tables<'organizations'>;
export type Profile = Tables<'profiles'>;
export type ControlResponseRow = Tables<'control_responses'>;
export type EvidenceRecordRow = Tables<'evidence_records'>;
export type CustomControlRow = Tables<'custom_controls'>;
export type FrameworkMappingRow = Tables<'framework_mappings'>;
export type AuditLogRow = Tables<'audit_log'>;
export type TrustCenterToken = Tables<'trust_center_tokens'>;
export type OrganizationInvite = Tables<'organization_invites'>;
export type OrganizationMember = Tables<'organization_members'>;
