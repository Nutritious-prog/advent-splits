-- Form of address chosen by the participant: M (on), F (ona), N (neutralnie).
alter table participants add column if not exists gender text not null default 'N'
  check (gender in ('M', 'F', 'N'));
