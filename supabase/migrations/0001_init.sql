-- THE ADVENT SPLITS — initial schema
-- All access goes through the Next.js server using a privileged connection.
-- RLS is enabled with NO policies, so Supabase's public anon/authenticated
-- roles (PostgREST) cannot read or write anything.

create table if not exists challenges (
  id            text primary key,
  category      text not null check (category in (
                  'RUNNING','STRENGTH','CALISTHENICS','MOBILITY','COORDINATION',
                  'CARDIO','OUTDOOR','SKILLS','GAMES','HYBRID')),
  title         text not null check (char_length(title) between 2 and 80),
  teaser        text not null,
  description   text not null,
  steps         jsonb not null default '[]'::jsonb,
  tips          text not null default '',
  difficulty    text not null check (difficulty in ('EASY','MEDIUM','HARD')),
  minutes       integer not null check (minutes between 1 and 600),
  equipment     jsonb not null default '[]'::jsonb,
  gear          text not null default 'NONE' check (gear in ('NONE','BASIC','GYM','FACILITY')),
  icon          text not null default 'activity',
  easier        text not null default '',
  harder        text not null default '',
  safety        text not null default '',
  caption       text not null default '',
  result_type   text not null default 'NOTE' check (result_type in ('TIME','REPS','DISTANCE','COUNT','WEIGHT','NOTE')),
  result_unit   text not null default '',
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists challenges_active_idx on challenges (active, difficulty);

create table if not exists participants (
  id                uuid primary key default gen_random_uuid(),
  nickname          text not null check (char_length(nickname) between 2 and 24),
  difficulty_pref   text not null default 'SURPRISE'
                    check (difficulty_pref in ('BEGINNER','INTERMEDIATE','ADVANCED','SURPRISE')),
  exclude_equipment boolean not null default false,
  email             text unique,
  auth_user_id      uuid unique,
  is_demo           boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists sessions (
  token_hash     text primary key,
  participant_id uuid not null references participants(id) on delete cascade,
  created_at     timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  expires_at     timestamptz not null
);
create index if not exists sessions_participant_idx on sessions (participant_id);

create table if not exists assignments (
  participant_id    uuid not null references participants(id) on delete cascade,
  day               smallint not null check (day between 1 and 31),
  challenge_id      text not null references challenges(id),
  assigned_at       timestamptz not null default now(),
  accepted_at       timestamptz,
  completed_at      timestamptz,
  result            text check (result is null or char_length(result) <= 80),
  result_updated_at timestamptz,
  primary key (participant_id, day),
  -- never the same challenge twice in one participant's calendar
  unique (participant_id, challenge_id)
);
create index if not exists assignments_challenge_idx on assignments (challenge_id);
create index if not exists assignments_completed_idx on assignments (completed_at);
create index if not exists assignments_assigned_idx on assignments (assigned_at);

create table if not exists admin_events (
  id         bigserial primary key,
  kind       text not null,
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table challenges   enable row level security;
alter table participants enable row level security;
alter table sessions     enable row level security;
alter table assignments  enable row level security;
alter table admin_events enable row level security;

-- Belt and braces on Supabase: strip table privileges from the API roles.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on challenges, participants, sessions, assignments, admin_events from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on challenges, participants, sessions, assignments, admin_events from authenticated;
  end if;
end $$;
