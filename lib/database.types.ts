export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string
          title: string
          type: string
          description: string | null
          workflow: 'flow' | 'drop'
          status: string
          created_at: string
          updated_at: string | null
          created_by: string
          current_step_index: number | null
          recipient: string | null
          rejection_reason: string | null
          qr_data: Json
          approval_steps: Json | null
          action_history: Json
        }
        Insert: {
          id: string
          title: string
          type: string
          description?: string | null
          workflow: 'flow' | 'drop'
          status: string
          created_at: string
          updated_at?: string | null
          created_by: string
          current_step_index?: number | null
          recipient?: string | null
          rejection_reason?: string | null
          qr_data: Json
          approval_steps?: Json | null
          action_history: Json
        }
        Update: {
          id?: string
          title?: string
          type?: string
          description?: string | null
          workflow?: 'flow' | 'drop'
          status?: string
          created_at?: string
          updated_at?: string | null
          created_by?: string
          current_step_index?: number | null
          recipient?: string | null
          rejection_reason?: string | null
          qr_data?: Json
          approval_steps?: Json | null
          action_history?: Json
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          email: string
          role: 'admin' | 'mail' | 'approver' | 'recipient'
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          role: 'admin' | 'mail' | 'approver' | 'recipient'
          created_at: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          role?: 'admin' | 'mail' | 'approver' | 'recipient'
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'admin' | 'mail' | 'approver' | 'recipient'
      workflow_type: 'flow' | 'drop'
      document_status: 
        | 'Ready for Pickup'
        | 'In Transit'
        | 'With Approver for Review'
        | 'Approved by Approver. Pending pickup for next step'
        | 'Approval Complete. Pending return to Originator'
        | 'Rejected. Awaiting Revision'
        | 'Delivered'
        | 'Completed and Archived'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 