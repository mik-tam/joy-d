-- Extend anonymous match profiles with playful signature composition fields
-- so two travelers can compare BRIGHTNESS / HOLD / BLOOM and IDs without
-- storing any camera, identity, or location data.

alter table public.joyd_match_profiles
  add column if not exists moment_code text,
  add column if not exists wonder_title text,
  add column if not exists held_for_ms integer,
  add column if not exists rise_rate real;

-- Worlds jsonb may now include an optional sprite hint per world
-- ({ worldName, quote, sprite }) for decorative match-card previews.
