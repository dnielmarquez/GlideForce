/**
 * GlideForce — App Types
 *
 * Convenient aliases and enriched types derived from Database.
 * Use these in components and hooks — never import raw DB types directly in UI code.
 */

import type { Database, UserRole, ProfileStatus, ClassColor, SessionStatus, BookingStatus, CancellationReason, WaitlistStatus, StarTransactionType, StarReferenceType, WaitlistMinutes } from './database.types'

export type {
  UserRole,
  ProfileStatus,
  ClassColor,
  SessionStatus,
  BookingStatus,
  CancellationReason,
  WaitlistStatus,
  StarTransactionType,
  StarReferenceType,
  WaitlistMinutes,
}

// ─── Raw row types (direct DB representation) ─────────────────────────────────

export type Profile           = Database['public']['Tables']['profiles']['Row']
export type Instructor        = Database['public']['Tables']['instructors']['Row']
export type ClassTemplate     = Database['public']['Tables']['class_templates']['Row']
export type ClassRecurrence   = Database['public']['Tables']['class_recurrences']['Row']
export type ClassSession      = Database['public']['Tables']['class_sessions']['Row']
export type Machine           = Database['public']['Tables']['machines']['Row']
export type Booking           = Database['public']['Tables']['bookings']['Row']
export type WaitlistEntry     = Database['public']['Tables']['waitlist_entries']['Row']
export type StarTransaction   = Database['public']['Tables']['star_transactions']['Row']
export type Settings          = Database['public']['Tables']['settings']['Row']

// ─── Insert types ─────────────────────────────────────────────────────────────

export type ProfileInsert         = Database['public']['Tables']['profiles']['Insert']
export type InstructorInsert      = Database['public']['Tables']['instructors']['Insert']
export type ClassTemplateInsert   = Database['public']['Tables']['class_templates']['Insert']
export type ClassRecurrenceInsert = Database['public']['Tables']['class_recurrences']['Insert']
export type ClassSessionInsert    = Database['public']['Tables']['class_sessions']['Insert']
export type MachineInsert         = Database['public']['Tables']['machines']['Insert']
export type BookingInsert         = Database['public']['Tables']['bookings']['Insert']
export type WaitlistEntryInsert   = Database['public']['Tables']['waitlist_entries']['Insert']
export type StarTransactionInsert = Database['public']['Tables']['star_transactions']['Insert']
export type SettingsUpdate        = Database['public']['Tables']['settings']['Update']

// ─── Enriched / joined types (for UI components) ─────────────────────────────

/** ClassSession with the full instructor object embedded */
export type SessionWithInstructor = ClassSession & {
  instructor: Instructor
}

/** ClassSession with instructor and the member's own booking (if any) */
export type SessionWithDetails = SessionWithInstructor & {
  booking:          Booking | null
  waitlist_entry:   WaitlistEntry | null
  enrolled_count:   number            // computed from confirmed bookings count
  waitlist_count:   number
}

/** Booking with session and machine details embedded */
export type BookingWithSession = Booking & {
  session:  ClassSession
  machine:  Machine | null
}

/** Waitlist entry with session embedded */
export type WaitlistWithSession = WaitlistEntry & {
  session: ClassSession
}

/** Star transaction with the admin who created it */
export type StarTransactionWithActor = StarTransaction & {
  created_by_profile: Pick<Profile, 'id' | 'full_name'> | null
}

/** Member (profile) with aggregated stats — for admin member list */
export type MemberWithStats = Profile & {
  total_classes_completed: number
  total_classes_cancelled: number
  upcoming_classes:        number
}

// ─── Form / payload types ─────────────────────────────────────────────────────

/** What the admin fills in to create a new class (template + first session) */
export type CreateClassPayload = {
  // Template fields
  title:            string
  description:      string
  instructor_id:    string
  duration_minutes: number
  capacity:         number
  stars_cost:       number
  color:            string

  // Schedule
  start_date:       string           // YYYY-MM-DD
  start_time:       string           // HH:MM

  // Recurrence
  is_recurring:     boolean
  end_date?:        string
  selected_days?:   number[]         // 0..6
  exclude_holidays?:boolean
}

/** What the admin fills in when editing a member's data */
export type UpdateMemberPayload = {
  full_name?: string
  phone?:     string | null
  status?:    ProfileStatus
}

/** Admin manual star adjustment */
export type StarAdjustmentPayload = {
  member_id: string
  amount:    number               // positive or negative
  note:      string               // required for admin_adjustment
}

// ─── Navigation / route helpers ───────────────────────────────────────────────

/** Represents a date the user selected in the booking flow */
export type SelectedDate = {
  date:      string               // YYYY-MM-DD
  is_full:   boolean
}

// ─── Settings helpers ─────────────────────────────────────────────────────────

/** Subset used by the cancellation policy logic */
export type CancellationPolicy = Pick<Settings, 'cancel_days'>

/** Subset used by the waitlist logic */
export type WaitlistConfig = Pick<Settings, 'waitlist_enabled' | 'waitlist_hours' | 'waitlist_minutes'>
