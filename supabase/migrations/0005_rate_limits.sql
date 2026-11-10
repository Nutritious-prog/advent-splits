-- Shared rate-limit counters (audit SEC-02, SEC-05). Works across serverless instances,
-- unlike in-memory limits. Keys are HMAC hashes: no raw e-mails or IP addresses are stored.
create table if not exists rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  count        integer not null default 0
);
create index if not exists rate_limits_window_idx on rate_limits (window_start);

alter table rate_limits enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on rate_limits from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on rate_limits from authenticated;
  end if;
end $$;
