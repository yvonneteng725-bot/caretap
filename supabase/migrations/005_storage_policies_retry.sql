-- Retry creating the storage buckets and policies from 001_initial.sql.
--
-- On hosted Supabase, statements against storage.objects can fail with
-- "must be owner of table objects" when the migration role doesn't own the
-- table — which leaves photo uploads failing with "new row violates
-- row-level security policy". Each statement below is wrapped so the
-- migration succeeds either way; if the policies still can't be created
-- here, create them via Dashboard -> Storage -> Policies, or rely on the
-- upload-photo Edge Function fallback the app now uses.

insert into storage.buckets (id, name, public)
  values ('log-photos', 'log-photos', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

do $$
begin
  begin
    create policy "log_photos_insert_with_access" on storage.objects
      for insert with check (
        bucket_id = 'log-photos'
        and has_elder_access((storage.foldername(name))[1]::uuid)
      );
  exception
    when duplicate_object then null;
    when insufficient_privilege then raise notice 'Cannot create storage policy here; use Dashboard -> Storage -> Policies';
  end;

  begin
    create policy "log_photos_update_with_access" on storage.objects
      for update using (
        bucket_id = 'log-photos'
        and has_elder_access((storage.foldername(name))[1]::uuid)
      );
  exception
    when duplicate_object then null;
    when insufficient_privilege then null;
  end;

  begin
    create policy "avatars_insert_own" on storage.objects
      for insert with check (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  exception
    when duplicate_object then null;
    when insufficient_privilege then null;
  end;

  begin
    create policy "avatars_update_own" on storage.objects
      for update using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  exception
    when duplicate_object then null;
    when insufficient_privilege then null;
  end;
end $$;
