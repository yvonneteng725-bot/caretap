-- CareTap initial schema, RLS policies, and storage buckets.
-- Run against a fresh Supabase project (Postgres + Auth + Storage).

create extension if not exists pgcrypto;

-- ============================================================
-- Tables
-- ============================================================

create table profiles (
  id uuid references auth.users primary key,
  full_name text,
  display_name text,
  avatar_url text,
  preferred_language text default 'zh-TW',  -- 'en' | 'zh-TW' | 'id'
  role text default 'caregiver',             -- 'admin' | 'caregiver' | 'family'
  created_at timestamptz default now()
);

create table elders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date_of_birth date,
  photo_url text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table elder_access (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid references elders(id) on delete cascade,
  user_id  uuid references profiles(id)  on delete cascade,
  role text default 'caregiver',           -- 'admin' | 'caregiver' | 'family'
  created_at timestamptz default now(),
  unique(elder_id, user_id)
);

create table logs (
  id uuid primary key default gen_random_uuid(),
  elder_id  uuid references elders(id) on delete cascade,
  logged_by uuid references profiles(id),
  card_type text not null,
  -- card_type values: 'medications' | 'blood_pressure' | 'body_temperature'
  --                   | 'blood_sugar' | 'wound_care' | 'meal_log'
  logged_at timestamptz default now(),
  note text,

  bp_systolic  integer,
  bp_diastolic integer,
  bp_pulse     integer,

  temperature_c  numeric(4,1),  -- always stored in Celsius

  glucose_mmol   numeric(5,2),  -- always stored in mmol/L
  glucose_timing text,          -- 'before_meal' | 'after_meal' | 'fasting' | null

  meal_intake    text,
  -- 'finished' | 'partial' | 'refused' | 'soft_only' | 'hydration'
  hydration_status text,        -- 'good' | 'low' | 'refused'

  -- Photo attachment (Wound Care and Meal Log only)
  -- Stored in Supabase Storage bucket 'log-photos'
  -- Path: {elder_id}/{card_type}/{log_id}.jpg
  photo_url text,

  created_at timestamptz default now()
);

create index logs_elder_id_logged_at_idx on logs (elder_id, logged_at desc);
create index logs_elder_id_card_type_idx on logs (elder_id, card_type);

create table medication_schedules (
  id uuid primary key default gen_random_uuid(),
  elder_id       uuid references elders(id) on delete cascade,
  schedule_times time[],   -- e.g. ARRAY['08:00'::time, '13:00'::time, '20:00'::time]
  active         boolean default true,
  created_at     timestamptz default now()
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id),
  subscription jsonb not null,   -- standard Web Push subscription object
  created_at   timestamptz default now()
);

-- Invite links (Settings > "Invite family member", Onboarding step 4).
-- Not listed in the original schema doc but required by the invite-link
-- feature described in the product spec.
create table invites (
  token uuid primary key default gen_random_uuid(),
  elder_id uuid references elders(id) on delete cascade,
  created_by uuid references profiles(id),
  role text default 'family',
  expires_at timestamptz not null,
  used_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ============================================================
-- Auto-create a profile row whenever a new auth user signs up
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- RLS helper functions
--
-- Policies on elder_access cannot query elder_access directly (Postgres
-- raises "infinite recursion detected in policy"), and other tables'
-- policies repeat the same membership check. These security-definer
-- functions bypass RLS for the lookup itself, breaking the recursion.
-- ============================================================

create or replace function public.has_elder_access(p_elder_id uuid)
returns boolean as $$
  select exists (
    select 1 from elder_access
    where elder_id = p_elder_id and user_id = auth.uid()
  );
$$ language sql security definer stable set search_path = public;

create or replace function public.is_elder_admin(p_elder_id uuid)
returns boolean as $$
  select exists (
    select 1 from elder_access
    where elder_id = p_elder_id and user_id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable set search_path = public;

grant execute on function public.has_elder_access(uuid) to authenticated;
grant execute on function public.is_elder_admin(uuid) to authenticated;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table elders enable row level security;
alter table elder_access enable row level security;
alter table logs enable row level security;
alter table medication_schedules enable row level security;
alter table push_subscriptions enable row level security;
alter table invites enable row level security;

-- profiles: user can read/update only their own row
create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());
create policy "profiles_insert_own" on profiles
  for insert with check (id = auth.uid());

-- elders: user can read elders they have a row in elder_access for
create policy "elders_select_with_access" on elders
  for select using (has_elder_access(id));
-- The creator must be able to see the row before their elder_access row
-- exists: onboarding inserts the elder, reads it back (insert ... returning
-- runs the select policy on the new row), and only then self-grants admin.
-- The elder_access_insert_creator_or_admin policy's exists() check on
-- elders is also evaluated under this select policy.
create policy "elders_select_creator" on elders
  for select using (created_by = auth.uid());
create policy "elders_insert_self" on elders
  for insert with check (created_by = auth.uid());
create policy "elders_update_admin" on elders
  for update using (is_elder_admin(id));

-- elder_access: user can read rows for elders they belong to; admins manage
-- membership. Self-grant of the admin role is only allowed to the user who
-- created the elder (the onboarding flow), never on someone else's elder.
create policy "elder_access_select_member" on elder_access
  for select using (
    user_id = auth.uid() or is_elder_admin(elder_id)
  );
create policy "elder_access_insert_creator_or_admin" on elder_access
  for insert with check (
    (
      user_id = auth.uid()
      and role = 'admin'
      and exists (select 1 from elders where elders.id = elder_id and elders.created_by = auth.uid())
    )
    or is_elder_admin(elder_id)
  );
create policy "elder_access_delete_admin" on elder_access
  for delete using (is_elder_admin(elder_id));

-- logs: user can read and insert logs only for elders they have access to
create policy "logs_select_with_access" on logs
  for select using (has_elder_access(elder_id));
create policy "logs_insert_with_access" on logs
  for insert with check (
    logged_by = auth.uid() and has_elder_access(elder_id)
  );
create policy "logs_update_with_access" on logs
  for update using (has_elder_access(elder_id));

-- medication_schedules: readable by anyone with elder access; writable by admin only
create policy "medication_schedules_select_with_access" on medication_schedules
  for select using (has_elder_access(elder_id));
create policy "medication_schedules_insert_admin" on medication_schedules
  for insert with check (is_elder_admin(elder_id));
create policy "medication_schedules_update_admin" on medication_schedules
  for update using (is_elder_admin(elder_id));

-- push_subscriptions: user can read/write only their own rows
create policy "push_subscriptions_select_own" on push_subscriptions
  for select using (user_id = auth.uid());
create policy "push_subscriptions_insert_own" on push_subscriptions
  for insert with check (user_id = auth.uid());
create policy "push_subscriptions_delete_own" on push_subscriptions
  for delete using (user_id = auth.uid());

-- invites: admins manage invites for their own elders; redemption goes
-- through the redeem_invite() security-definer function below.
create policy "invites_select_admin" on invites
  for select using (is_elder_admin(elder_id));
create policy "invites_insert_admin" on invites
  for insert with check (
    created_by = auth.uid() and is_elder_admin(elder_id)
  );

-- ============================================================
-- redeem_invite(): validates a token and grants elder_access to the caller
-- ============================================================

create or replace function public.redeem_invite(invite_token uuid)
returns uuid as $$
declare
  v_invite invites%rowtype;
begin
  select * into v_invite from invites
    where token = invite_token
      and used_by is null
      and expires_at > now();

  if not found then
    raise exception 'Invalid or expired invite';
  end if;

  insert into elder_access (elder_id, user_id, role)
    values (v_invite.elder_id, auth.uid(), v_invite.role)
    on conflict (elder_id, user_id) do update set role = excluded.role;

  update invites set used_by = auth.uid() where token = invite_token;

  return v_invite.elder_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.redeem_invite(uuid) to authenticated;

-- ============================================================
-- Storage buckets
-- ============================================================

insert into storage.buckets (id, name, public)
  values ('log-photos', 'log-photos', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- log-photos: path is {elder_id}/{card_type}/{log_id}.jpg — only members
-- of that elder may upload into that elder's folder. Reads are public
-- because the bucket itself is public.
create policy "log_photos_insert_with_access" on storage.objects
  for insert with check (
    bucket_id = 'log-photos'
    and has_elder_access((storage.foldername(name))[1]::uuid)
  );
create policy "log_photos_update_with_access" on storage.objects
  for update using (
    bucket_id = 'log-photos'
    and has_elder_access((storage.foldername(name))[1]::uuid)
  );

-- avatars: path is {user_id}.jpg or {user_id}/... — a user may only write
-- into their own folder.
create policy "avatars_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars_update_own" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- Realtime
--
-- The Today feed subscribes to postgres_changes on logs; the table must be
-- in the supabase_realtime publication or no events are ever delivered.
-- ============================================================

alter publication supabase_realtime add table logs;
