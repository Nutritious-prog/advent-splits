-- Data minimisation: the e-mail address lives only in Supabase Auth (auth.users).
-- A participant is "linked" when auth_user_id is set.
alter table participants drop column if exists email;
