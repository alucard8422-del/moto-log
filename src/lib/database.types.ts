export type Mood = '여유로운' | '감성적인' | '도전적인'

export interface Database {
  public: {
    Tables: {
      courses: {
        Row: CourseRow
        Insert: CourseInsert
        Update: Partial<CourseInsert>
      }
      profiles: {
        Row: ProfileRow
        Insert: ProfileInsert
        Update: Partial<ProfileInsert>
      }
    }
  }
}

/* ── courses ── */
export interface CourseRow {
  id: string               // uuid, PK
  user_id: string          // auth.users FK
  title: string
  region: string
  distance_km: number
  mood: Mood
  description: string | null
  tags: string[]           // text[]
  image_url: string | null
  created_at: string       // timestamptz
}

export type CourseInsert = Omit<CourseRow, 'id' | 'created_at'>

/* ── profiles ── */
export interface ProfileRow {
  id: string               // auth.users FK (1:1)
  bike_model: string
  total_km: number
  riding_hours: string     // e.g. "48h"
  completed_courses: number
  updated_at: string       // timestamptz
}

export type ProfileInsert = Omit<ProfileRow, 'updated_at'>
