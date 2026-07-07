-- Deleting an auth user (dashboard "Delete user", GDPR/account removal) was
-- impossible: profiles.id blocked the delete, and several tables blocked
-- deleting the profile in turn. Cascade the identity rows and keep the care
-- history, detaching it from the deleted author.

alter table profiles
  drop constraint profiles_id_fkey,
  add constraint profiles_id_fkey
    foreign key (id) references auth.users(id) on delete cascade;

alter table push_subscriptions
  drop constraint push_subscriptions_user_id_fkey,
  add constraint push_subscriptions_user_id_fkey
    foreign key (user_id) references profiles(id) on delete cascade;

alter table elders
  drop constraint elders_created_by_fkey,
  add constraint elders_created_by_fkey
    foreign key (created_by) references profiles(id) on delete set null;

alter table logs
  drop constraint logs_logged_by_fkey,
  add constraint logs_logged_by_fkey
    foreign key (logged_by) references profiles(id) on delete set null;

alter table invites
  drop constraint invites_created_by_fkey,
  add constraint invites_created_by_fkey
    foreign key (created_by) references profiles(id) on delete set null,
  drop constraint invites_used_by_fkey,
  add constraint invites_used_by_fkey
    foreign key (used_by) references profiles(id) on delete set null;
