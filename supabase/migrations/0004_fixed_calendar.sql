-- One shared calendar: each active challenge can be scheduled for a specific day,
-- so everyone gets the same challenge on the same day and results are comparable.
alter table challenges add column if not exists day smallint check (day is null or day between 1 and 31);
alter table challenges add column if not exists swap text not null default '';
create unique index if not exists challenges_day_active_unique on challenges (day) where day is not null and active;

-- Endurance-focused categories (old values kept so existing rows stay valid).
alter table challenges drop constraint if exists challenges_category_check;
alter table challenges add constraint challenges_category_check check (category in (
  'RUNNING','CYCLING','SWIMMING','HIKING','STRENGTH','MOBILITY','MULTISPORT',
  'CALISTHENICS','COORDINATION','CARDIO','OUTDOOR','SKILLS','GAMES','HYBRID'));

-- The previous random pool is retired; the new scheduled calendar is inserted by the seed.
update challenges set active = false where day is null;
