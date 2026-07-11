-- Care-circle members can delete log entries (undo on the confirmation
-- screen, and edit/delete from the Today/History feeds).
create policy "logs_delete_with_access" on logs
  for delete using (has_elder_access(elder_id));
