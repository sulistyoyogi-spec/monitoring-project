create table if not exists project_rows (
  id text primary key, year integer, code text, project text, customer text, pc text,
  status text not null, risk text not null, delivery_target date, payload jsonb not null,
  synced_at timestamptz not null default now()
);
create index if not exists project_rows_active_target on project_rows(status, delivery_target);
create table if not exists monitor_summary (id text primary key, payload jsonb not null, synced_at timestamptz not null default now());
