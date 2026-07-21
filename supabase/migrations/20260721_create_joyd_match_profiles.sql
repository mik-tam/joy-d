-- Anonymous JOY:D matching profiles. This table is server-only: RLS is
-- enabled with no browser policies, and the service-role key is used solely
-- by the /api/smile-matches server route.
--
-- Stored data is deliberately minimal: a random browser-session token, a
-- playful derived signature, and three AI-generated world summaries. Never
-- store camera frames, face landmarks, names, accounts, locations, or IPs.

create table if not exists public.joyd_match_profiles (
  session_id text primary key,
  shape text not null check (shape in ('Gentle Bloom', 'Bright Spark', 'Slow Sunrise')),
  signal_percent smallint not null check (signal_percent between 0 and 100),
  color_trail jsonb not null,
  worlds jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists joyd_match_profiles_expires_at_idx
  on public.joyd_match_profiles (expires_at);

alter table public.joyd_match_profiles enable row level security;
