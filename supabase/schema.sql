-- ============================================================
-- MotoLog — Supabase Schema
-- Supabase 대시보드 > SQL Editor 에 그대로 붙여넣고 실행하세요.
-- ============================================================

-- ── 확장 (uuid 생성) ──────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── ENUM: 코스 분위기 ─────────────────────────────────────
do $$ begin
  create type mood_type as enum ('여유로운', '감성적인', '도전적인');
exception
  when duplicate_object then null;
end $$;


-- ┌─────────────────────────────────────────────────────────┐
-- │  courses                                                │
-- └─────────────────────────────────────────────────────────┘
create table if not exists public.courses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  region        text not null,
  distance_km   integer not null default 0,
  mood          mood_type not null default '여유로운',
  description   text,
  tags          text[] not null default '{}',
  image_url     text,
  created_at    timestamptz not null default now()
);

-- 인덱스: 유저별 최신순 조회
create index if not exists courses_user_id_created_at_idx
  on public.courses (user_id, created_at desc);

-- RLS 활성화
alter table public.courses enable row level security;

-- 정책: 본인 데이터만 CRUD
create policy "courses: 본인만 조회"
  on public.courses for select
  using (auth.uid() = user_id);

create policy "courses: 본인만 삽입"
  on public.courses for insert
  with check (auth.uid() = user_id);

create policy "courses: 본인만 수정"
  on public.courses for update
  using (auth.uid() = user_id);

create policy "courses: 본인만 삭제"
  on public.courses for delete
  using (auth.uid() = user_id);


-- ┌─────────────────────────────────────────────────────────┐
-- │  profiles                                               │
-- └─────────────────────────────────────────────────────────┘
create table if not exists public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  bike_model         text not null default '',
  total_km           integer not null default 0,
  riding_hours       text not null default '0h',
  completed_courses  integer not null default 0,
  updated_at         timestamptz not null default now()
);

-- RLS 활성화
alter table public.profiles enable row level security;

-- 정책: 본인 프로필만 접근
create policy "profiles: 본인만 조회"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: 본인만 삽입"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: 본인만 수정"
  on public.profiles for update
  using (auth.uid() = id);


-- ┌─────────────────────────────────────────────────────────┐
-- │  트리거: 회원 가입 시 profiles 행 자동 생성             │
-- └─────────────────────────────────────────────────────────┘
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
