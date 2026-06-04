/**
 * Supabase Database 타입 — 마이그레이션 0001_initial.sql과 정합.
 *
 * 실 운영에서는 `supabase gen types typescript`로 자동 생성하지만
 * PoC 단계에서는 손으로 유지.
 *
 * 주의: @supabase/supabase-js의 GenericSchema/GenericTable과 모양이 맞아야
 *  Insert/Update/select() 타입 추론이 동작한다. 누락 시 `never`로 떨어짐.
 *  필수: Tables/Views/Functions (스키마), Row/Insert/Update/Relationships (테이블).
 */

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      facilities: {
        Row: {
          id: string;
          name: string;
          code: string;
          phone: string | null;
          manager_name: string | null;
          manager_phone: string | null;
          address: string | null;
          default_consent: { L1: boolean; L2: boolean; L3: boolean; L4: boolean; L5: boolean; L6: boolean };
          notification_prefs: { crisisEmail: boolean; autoSendReport: boolean; weeklyDigest: boolean; ruleViolationDigest: boolean };
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          phone?: string | null;
          manager_name?: string | null;
          manager_phone?: string | null;
          address?: string | null;
          default_consent?: { L1: boolean; L2: boolean; L3: boolean; L4: boolean; L5: boolean; L6: boolean };
          notification_prefs?: { crisisEmail: boolean; autoSendReport: boolean; weeklyDigest: boolean; ruleViolationDigest: boolean };
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['facilities']['Insert']>;
        Relationships: [];
      };
      admins: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: 'admin' | 'facilitator' | 'viewer';
          facility_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          role?: 'admin' | 'facilitator' | 'viewer';
          facility_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['admins']['Insert']>;
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          facility_id: string;
          name: string;
          age: number;
          cognitive_level: 'normal' | 'MCI' | 'moderate';
          guardian_name: string | null;
          guardian_relation: string | null;
          guardian_phone: string | null;
          guardian_email: string | null;
          kakao_channel_linked: boolean;
          family_status: { father: string; mother: string; spouse: string } | null;
          taboo_topics: string[] | null;
          consent: { L1: boolean; L2: boolean; L3: boolean; L4: boolean; L5: boolean; L6: boolean } | null;
          session_count: number;
          last_session_at: string | null;
          in_active_session: boolean;
          registered_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          // 필수 (DB default 없음)
          facility_id: string;
          name: string;
          age: number;
          // 선택 (DB default 있음 / nullable)
          id?: string;
          cognitive_level?: 'normal' | 'MCI' | 'moderate';
          guardian_name?: string | null;
          guardian_relation?: string | null;
          guardian_phone?: string | null;
          guardian_email?: string | null;
          kakao_channel_linked?: boolean;
          family_status?: { father: string; mother: string; spouse: string } | null;
          taboo_topics?: string[] | null;
          consent?: { L1: boolean; L2: boolean; L3: boolean; L4: boolean; L5: boolean; L6: boolean } | null;
          session_count?: number;
          last_session_at?: string | null;
          in_active_session?: boolean;
          registered_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['members']['Insert']>;
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          member_id: string;
          session_number: number;
          started_at: string;
          ended_at: string | null;
          status: 'active' | 'wrapup' | 'force_end' | 'post_processing' | 'completed';
          duration_minutes: number;
          turn_count: number;
          depth_level: number;
          risk_level: 'low' | 'medium' | 'high';
          treasure_detected: boolean;
          risk_flagged: boolean;
          main_topic: string | null;
          topics: string[] | null;
          emotional_score: number | null;
          last_session_state: Json;
          extraction: Json | null;
          mode: 'voice' | 'stenographer' | 'realtime';
          created_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          session_number: number;
          started_at?: string;
          ended_at?: string | null;
          status?: 'active' | 'wrapup' | 'force_end' | 'post_processing' | 'completed';
          duration_minutes?: number;
          turn_count?: number;
          depth_level?: number;
          risk_level?: 'low' | 'medium' | 'high';
          treasure_detected?: boolean;
          risk_flagged?: boolean;
          main_topic?: string | null;
          topics?: string[] | null;
          emotional_score?: number | null;
          last_session_state?: Json;
          extraction?: Json | null;
          mode?: 'voice' | 'stenographer' | 'realtime';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['sessions']['Insert']>;
        Relationships: [];
      };
      conversation_turns: {
        Row: {
          id: string;
          session_id: string;
          turn_index: number;
          role: 'ai' | 'elderly';
          text: string;
          timestamp_sec: number;
          duration_sec: number | null;
          stt_confidence: number | null;
          stt_low_confidence_words: Json | null;
          stt_garbage_detected: boolean;
          audio_features: Json | null;
          llm_structured: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          turn_index: number;
          role: 'ai' | 'elderly';
          text: string;
          timestamp_sec?: number;
          duration_sec?: number | null;
          stt_confidence?: number | null;
          stt_low_confidence_words?: Json | null;
          stt_garbage_detected?: boolean;
          audio_features?: Json | null;
          llm_structured?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['conversation_turns']['Insert']>;
        Relationships: [];
      };
      audio_files: {
        Row: {
          id: string;
          session_id: string;
          storage_path: string | null;
          format: 'webm' | 'mp3' | 'm4a';
          duration_sec: number;
          size_bytes: number;
          channels: number;
          sample_rate_hz: number;
          stored: boolean;
          consent_verified_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['audio_files']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audio_files']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
