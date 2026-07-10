-- Let creators read elders they created, independent of elder_access.
--
-- Onboarding step 1 previously did `insert into elders ... returning *`.
-- Postgres checks RETURNING rows against the table's SELECT policies, and
-- the only one ("elders_select_with_access") depends on an elder_access row
-- that is inserted *after* the elder — so the insert itself failed RLS and
-- onboarding silently stalled. The client no longer relies on RETURNING,
-- but the creator should still always be able to read their own elders so
-- any insert-then-read flow works.

create policy "elders_select_creator" on elders
  for select using (created_by = auth.uid());
