export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ── Domain enums ─────────────────────────────────────────────
export type AfterhoursMode   = 'takemessage' | 'book' | 'off'
export type UserRole         = 'owner' | 'admin'
export type SubscriptionStatus =
  | 'trialing' | 'active' | 'past_due' | 'canceled'
  | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'paused'
export type CallStatus       = 'registered' | 'ongoing' | 'completed' | 'missed' | 'voicemail' | 'error'
export type CallType         = 'inbound' | 'outbound'
export type Sentiment        = 'positive' | 'neutral' | 'frustrated'
export type JobType          =
  | 'ac_repair' | 'ac_not_turning_on' | 'furnace_repair'
  | 'furnace_not_turning_on' | 'installation' | 'maintenance'
  | 'ductwork' | 'thermostat' | 'refrigerant' | 'emergency' | 'other'
export type Urgency          = 'emergency' | 'soon' | 'scheduled'
export type BookingStatus    = 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type NotificationChannel = 'email' | 'sms'
export type NotificationType =
  | 'call_summary' | 'appointment_confirmation' | 'appointment_reminder'
  | 'appointment_cancelled' | 'missed_call' | 'trial_drip' | 'payment_receipt' | 'custom'
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'

export type BusinessHours = {
  [day in 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun']: {
    open: string
    close: string
    enabled: boolean
  }
}

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string
          owner_user_id: string
          name: string
          phone_number: string | null
          retell_agent_id: string | null
          retell_phone_id: string | null
          timezone: string
          calendly_url: string | null
          gcal_token: Json | null
          business_hours: Json
          afterhours_mode: AfterhoursMode
          service_area: string | null
          owner_first_name: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_user_id: string
          name: string
          phone_number?: string | null
          retell_agent_id?: string | null
          retell_phone_id?: string | null
          timezone?: string
          calendly_url?: string | null
          gcal_token?: Json | null
          business_hours?: Json
          afterhours_mode?: AfterhoursMode
          service_area?: string | null
          owner_first_name?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          phone_number?: string | null
          retell_agent_id?: string | null
          retell_phone_id?: string | null
          timezone?: string
          calendly_url?: string | null
          gcal_token?: Json | null
          business_hours?: Json
          afterhours_mode?: AfterhoursMode
          service_area?: string | null
          owner_first_name?: string | null
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string
          business_id: string | null
          role: UserRole
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          email: string
          business_id?: string | null
          role?: UserRole
          created_at?: string
        }
        Update: {
          full_name?: string | null
          email?: string
          business_id?: string | null
          role?: UserRole
        }
        Relationships: [
          {
            foreignKeyName: 'user_profiles_business_id_fkey'
            columns: ['business_id']
            isOneToOne: false
            referencedRelation: 'businesses'
            referencedColumns: ['id']
          }
        ]
      }
      subscriptions: {
        Row: {
          id: string
          business_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          status: SubscriptionStatus
          plan: string
          trial_ends_at: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          stripe_price_id: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: SubscriptionStatus
          plan?: string
          trial_ends_at?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          stripe_price_id?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: SubscriptionStatus
          plan?: string
          trial_ends_at?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          stripe_price_id?: string | null
          metadata?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subscriptions_business_id_fkey'
            columns: ['business_id']
            isOneToOne: false
            referencedRelation: 'businesses'
            referencedColumns: ['id']
          }
        ]
      }
      calls: {
        Row: {
          id: string
          business_id: string
          retell_call_id: string
          caller_number: string
          caller_name: string | null
          started_at: string | null
          ended_at: string | null
          duration_seconds: number | null
          status: CallStatus
          call_type: CallType
          sentiment: Sentiment | null
          job_type: JobType | null
          urgency: Urgency | null
          estimated_value: number | null
          recording_url: string | null
          summary: string | null
          appointment_booked: boolean
          retell_metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          retell_call_id: string
          caller_number: string
          caller_name?: string | null
          started_at?: string | null
          ended_at?: string | null
          duration_seconds?: number | null
          status?: CallStatus
          call_type?: CallType
          sentiment?: Sentiment | null
          job_type?: JobType | null
          urgency?: Urgency | null
          estimated_value?: number | null
          recording_url?: string | null
          summary?: string | null
          appointment_booked?: boolean
          retell_metadata?: Json
          created_at?: string
        }
        Update: {
          caller_name?: string | null
          ended_at?: string | null
          duration_seconds?: number | null
          status?: CallStatus
          sentiment?: Sentiment | null
          job_type?: JobType | null
          urgency?: Urgency | null
          estimated_value?: number | null
          recording_url?: string | null
          summary?: string | null
          appointment_booked?: boolean
          retell_metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'calls_business_id_fkey'
            columns: ['business_id']
            isOneToOne: false
            referencedRelation: 'businesses'
            referencedColumns: ['id']
          }
        ]
      }
      transcripts: {
        Row: {
          id: string
          call_id: string
          business_id: string
          turns: Json
          full_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          call_id: string
          business_id: string
          turns?: Json
          full_text?: string | null
          created_at?: string
        }
        Update: {
          turns?: Json
          full_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'transcripts_call_id_fkey'
            columns: ['call_id']
            isOneToOne: true
            referencedRelation: 'calls'
            referencedColumns: ['id']
          }
        ]
      }
      bookings: {
        Row: {
          id: string
          call_id: string | null
          business_id: string
          customer_name: string
          customer_phone: string
          customer_email: string | null
          customer_address: string
          job_type: JobType
          urgency: Urgency
          notes: string | null
          scheduled_start: string | null
          scheduled_end: string | null
          calendar_event_id: string | null
          status: BookingStatus
          cancellation_reason: string | null
          estimated_value: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          call_id?: string | null
          business_id: string
          customer_name: string
          customer_phone: string
          customer_email?: string | null
          customer_address: string
          job_type: JobType
          urgency?: Urgency
          notes?: string | null
          scheduled_start?: string | null
          scheduled_end?: string | null
          calendar_event_id?: string | null
          status?: BookingStatus
          cancellation_reason?: string | null
          estimated_value?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          customer_name?: string
          customer_phone?: string
          customer_email?: string | null
          customer_address?: string
          job_type?: JobType
          urgency?: Urgency
          notes?: string | null
          scheduled_start?: string | null
          scheduled_end?: string | null
          calendar_event_id?: string | null
          status?: BookingStatus
          cancellation_reason?: string | null
          estimated_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bookings_business_id_fkey'
            columns: ['business_id']
            isOneToOne: false
            referencedRelation: 'businesses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bookings_call_id_fkey'
            columns: ['call_id']
            isOneToOne: false
            referencedRelation: 'calls'
            referencedColumns: ['id']
          }
        ]
      }
      email_sequences: {
        Row: {
          id: string
          business_id: string
          email: string
          step: number
          trial_start: string
          converted: boolean
          unsubscribed: boolean
          last_sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          email: string
          step?: number
          trial_start?: string
          converted?: boolean
          unsubscribed?: boolean
          last_sent_at?: string | null
          created_at?: string
        }
        Update: {
          step?: number
          converted?: boolean
          unsubscribed?: boolean
          last_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'email_sequences_business_id_fkey'
            columns: ['business_id']
            isOneToOne: false
            referencedRelation: 'businesses'
            referencedColumns: ['id']
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          business_id: string
          call_id: string | null
          booking_id: string | null
          channel: NotificationChannel
          type: NotificationType
          to_address: string
          subject: string | null
          body: string
          status: NotificationStatus
          provider_message_id: string | null
          error_message: string | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          call_id?: string | null
          booking_id?: string | null
          channel: NotificationChannel
          type: NotificationType
          to_address: string
          subject?: string | null
          body: string
          status?: NotificationStatus
          provider_message_id?: string | null
          error_message?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          status?: NotificationStatus
          provider_message_id?: string | null
          error_message?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_business_id_fkey'
            columns: ['business_id']
            isOneToOne: false
            referencedRelation: 'businesses'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      auth_business_id: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// ── Convenience aliases ───────────────────────────────────────
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Business       = Tables<'businesses'>
export type UserProfile    = Tables<'user_profiles'>
export type Subscription   = Tables<'subscriptions'>
export type Call           = Tables<'calls'>
export type Transcript     = Tables<'transcripts'>
export type Booking        = Tables<'bookings'>
export type EmailSequence  = Tables<'email_sequences'>
export type Notification   = Tables<'notifications'>

export type BusinessInsert    = TablesInsert<'businesses'>
export type CallInsert         = TablesInsert<'calls'>
export type TranscriptInsert   = TablesInsert<'transcripts'>
export type BookingInsert      = TablesInsert<'bookings'>
export type NotificationInsert = TablesInsert<'notifications'>
