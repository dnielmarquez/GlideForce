/**
 * GlideForce — Database Types
 *
 * Mirrors the Supabase schema 1:1.
 * Row   = what SELECT returns
 * Insert = what INSERT accepts (required fields only; optional for columns with DB defaults)
 * Update = what UPDATE accepts (everything optional)
 *
 * Feed this into createClient<Database>() for end-to-end type safety.
 */

// ─── Scalar union types (from CHECK constraints) ──────────────────────────────

export type UserRole            = 'member' | 'admin' | 'instructor'
export type ProfileStatus       = 'active' | 'inactive'
export type ClassColor          = 'orange' | 'teal' | 'purple' | 'blue' | 'rose'
export type SessionStatus       = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type BookingStatus       = 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type CancellationReason  = 'member' | 'admin' | 'session_cancelled'
export type WaitlistStatus      = 'waiting' | 'offered' | 'confirmed' | 'expired' | 'cancelled'
export type StarTransactionType = 'star_purchase' | 'booking_charged' | 'cancellation_refund' | 'admin_adjustment' | 'welcome_bonus'
export type StarReferenceType   = 'booking' | 'session' | 'manual'
export type WaitlistMinutes     = 0 | 15 | 30 | 45

// ─── Database ─────────────────────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {

      // ── profiles ────────────────────────────────────────────────
      profiles: {
        Row: {
          id:             string          // uuid — equals auth.users.id
          full_name:      string
          email:          string | null
          phone:          string | null
          role:           UserRole
          stars_balance:  number
          status:         ProfileStatus
          avatar_url:     string | null
          created_at:     string          // timestamptz as ISO string
          updated_at:     string
        }
        Insert: {
          id:             string          // required — must match auth.users.id
          full_name:      string
          email?:         string | null
          phone?:         string | null
          role?:          UserRole        // default: 'member'
          stars_balance?: number          // default: 0
          status?:        ProfileStatus   // default: 'active'
          avatar_url?:    string | null
          created_at?:    string
          updated_at?:    string
        }
        Update: {
          id?:            string
          full_name?:     string
          email?:         string | null
          phone?:         string | null
          role?:          UserRole
          stars_balance?: number
          status?:        ProfileStatus
          avatar_url?:    string | null
          updated_at?:    string
        }
      }

      // ── instructors ─────────────────────────────────────────────
      instructors: {
        Row: {
          id:          string
          profile_id:  string | null      // nullable — instructor may not have an account
          name:        string
          specialty:   string | null
          initials:    string
          color:       string             // hex color
          bio:         string | null
          photo_url:   string | null
          active:      boolean
          created_at:  string
        }
        Insert: {
          id?:         string
          profile_id?: string | null
          name:        string
          specialty?:  string | null
          initials:    string
          color:       string
          bio?:        string | null
          photo_url?:  string | null
          active?:     boolean            // default: true
          created_at?: string
        }
        Update: {
          id?:         string
          profile_id?: string | null
          name?:       string
          specialty?:  string | null
          initials?:   string
          color?:      string
          bio?:        string | null
          photo_url?:  string | null
          active?:     boolean
        }
      }

      // ── class_templates ─────────────────────────────────────────
      class_templates: {
        Row: {
          id:               string
          title:            string
          description:      string | null
          instructor_id:    string
          duration_minutes: number
          capacity:         number
          stars_cost:       number
          color:            ClassColor
          active:           boolean
          created_by:       string | null
          created_at:       string
        }
        Insert: {
          id?:              string
          title:            string
          description?:     string | null
          instructor_id:    string
          duration_minutes: number
          capacity:         number
          stars_cost?:      number        // default: 1
          color?:           ClassColor    // default: 'orange'
          active?:          boolean       // default: true
          created_by?:      string | null
          created_at?:      string
        }
        Update: {
          id?:              string
          title?:           string
          description?:     string | null
          instructor_id?:   string
          duration_minutes?:number
          capacity?:        number
          stars_cost?:      number
          color?:           ClassColor
          active?:          boolean
          created_by?:      string | null
        }
      }

      // ── class_recurrences ────────────────────────────────────────
      class_recurrences: {
        Row: {
          id:               string
          template_id:      string | null
          start_date:       string        // ISO date: YYYY-MM-DD
          end_date:         string
          selected_days:    number[]      // 0..6 (Sun..Sat)
          exclude_holidays: boolean
          sessions_created: number
          created_by:       string | null
          created_at:       string
        }
        Insert: {
          id?:              string
          template_id?:     string | null
          start_date:       string
          end_date:         string
          selected_days:    number[]
          exclude_holidays?:boolean       // default: true
          sessions_created?:number        // default: 0
          created_by?:      string | null
          created_at?:      string
        }
        Update: {
          template_id?:     string | null
          start_date?:      string
          end_date?:        string
          selected_days?:   number[]
          exclude_holidays?:boolean
          sessions_created?:number
        }
      }

      // ── class_sessions ───────────────────────────────────────────
      class_sessions: {
        Row: {
          id:                  string
          template_id:         string | null
          recurrence_id:       string | null
          title:               string
          description:         string | null
          instructor_id:       string
          date:                string      // ISO date: YYYY-MM-DD
          start_time:          string      // HH:MM:SS
          duration_minutes:    number
          capacity:            number
          stars_cost:          number
          color:               ClassColor
          status:              SessionStatus
          cancelled_at:        string | null
          cancellation_reason: string | null
          created_by:          string | null
          created_at:          string
        }
        Insert: {
          id?:                 string
          template_id?:        string | null
          recurrence_id?:      string | null
          title:               string
          description?:        string | null
          instructor_id:       string
          date:                string
          start_time:          string
          duration_minutes:    number
          capacity:            number
          stars_cost?:         number      // default: 1
          color?:              ClassColor  // default: 'orange'
          status?:             SessionStatus // default: 'scheduled'
          cancelled_at?:       string | null
          cancellation_reason?:string | null
          created_by?:         string | null
          created_at?:         string
        }
        Update: {
          template_id?:        string | null
          recurrence_id?:      string | null
          title?:              string
          description?:        string | null
          instructor_id?:      string
          date?:               string
          start_time?:         string
          duration_minutes?:   number
          capacity?:           number
          stars_cost?:         number
          color?:              ClassColor
          status?:             SessionStatus
          cancelled_at?:       string | null
          cancellation_reason?:string | null
        }
      }

      // ── machines ─────────────────────────────────────────────────
      machines: {
        Row: {
          id:         string
          label:      string              // e.g. 'M-01'
          number:     number
          active:     boolean
          created_at: string
        }
        Insert: {
          id?:        string
          label:      string
          number:     number
          active?:    boolean             // default: true
          created_at?:string
        }
        Update: {
          label?:     string
          number?:    number
          active?:    boolean
        }
      }

      // ── bookings ─────────────────────────────────────────────────
      bookings: {
        Row: {
          id:                  string
          session_id:          string
          member_id:           string
          machine_id:          string | null
          status:              BookingStatus
          stars_spent:         number
          star_refunded:       boolean
          cancelled_at:        string | null
          cancellation_reason: CancellationReason | null
          notes:               string | null
          created_at:          string
        }
        Insert: {
          id?:                 string
          session_id:          string
          member_id:           string
          machine_id?:         string | null
          status?:             BookingStatus       // default: 'confirmed'
          stars_spent?:        number              // default: 1
          star_refunded?:      boolean             // default: false
          cancelled_at?:       string | null
          cancellation_reason?:CancellationReason | null
          notes?:              string | null
          created_at?:         string
        }
        Update: {
          machine_id?:         string | null
          status?:             BookingStatus
          stars_spent?:        number
          star_refunded?:      boolean
          cancelled_at?:       string | null
          cancellation_reason?:CancellationReason | null
          notes?:              string | null
        }
      }

      // ── waitlist_entries ─────────────────────────────────────────
      waitlist_entries: {
        Row: {
          id:         string
          session_id: string
          member_id:  string
          position:   number
          status:     WaitlistStatus
          offered_at: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?:        string
          session_id: string
          member_id:  string
          position:   number
          status?:    WaitlistStatus  // default: 'waiting'
          offered_at?:string | null
          expires_at?:string | null
          created_at?:string
        }
        Update: {
          position?:  number
          status?:    WaitlistStatus
          offered_at?:string | null
          expires_at?:string | null
        }
      }

      // ── star_transactions ────────────────────────────────────────
      star_transactions: {
        Row: {
          id:             string
          member_id:      string
          amount:         number          // positive = credit, negative = debit
          type:           StarTransactionType
          reference_id:   string | null   // bookings.id or class_sessions.id
          reference_type: StarReferenceType | null
          note:           string | null
          created_by:     string | null
          created_at:     string
        }
        Insert: {
          id?:            string
          member_id:      string
          amount:         number
          type:           StarTransactionType
          reference_id?:  string | null
          reference_type?:StarReferenceType | null
          note?:          string | null
          created_by?:    string | null
          created_at?:    string
        }
        Update: {
          note?:          string | null   // only note is ever updated
        }
      }

      // ── settings ─────────────────────────────────────────────────
      settings: {
        Row: {
          id:               number       // always 1
          cancel_days:      number
          waitlist_hours:   number
          waitlist_minutes: WaitlistMinutes
          machines_count:   number
          studio_name:      string
          contact_email:    string
          currency:         string
          timezone:         string
          booking_open:     boolean
          waitlist_enabled: boolean
          notify_email:     boolean
          notify_push:      boolean
          updated_at:       string
          updated_by:       string | null
        }
        Insert: {
          id?:              number
          cancel_days?:     number
          waitlist_hours?:  number
          waitlist_minutes?:WaitlistMinutes
          machines_count?:  number
          studio_name?:     string
          contact_email?:   string
          currency?:        string
          timezone?:        string
          booking_open?:    boolean
          waitlist_enabled?:boolean
          notify_email?:    boolean
          notify_push?:     boolean
          updated_at?:      string
          updated_by?:      string | null
        }
        Update: {
          cancel_days?:     number
          waitlist_hours?:  number
          waitlist_minutes?:WaitlistMinutes
          machines_count?:  number
          studio_name?:     string
          contact_email?:   string
          currency?:        string
          timezone?:        string
          booking_open?:    boolean
          waitlist_enabled?:boolean
          notify_email?:    boolean
          notify_push?:     boolean
          updated_at?:      string
          updated_by?:      string | null
        }
      }
    }

    Functions: Record<string, never>
    Enums:     Record<string, never>
  }
}
