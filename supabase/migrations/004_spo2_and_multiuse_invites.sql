-- 1. Optional blood-oxygen (SpO2) reading on blood pressure logs.
alter table logs add column if not exists spo2 integer;

-- 2. Invites become multi-use within their expiry window: one link can be
-- shared with the whole family (the elder themselves, caregivers, relatives)
-- and every account that opens it gets linked to the same elder via
-- elder_access. Previously a link died after the first redemption, so the
-- second family member always saw "invalid or expired".
--
-- used_by now records the most recent redeemer. Existing access rows are
-- left untouched on re-redemption so an admin's role can't be downgraded
-- by opening a 'family' invite.
create or replace function public.redeem_invite(invite_token uuid)
returns uuid as $$
declare
  v_invite invites%rowtype;
begin
  select * into v_invite from invites
    where token = invite_token
      and expires_at > now();

  if not found then
    raise exception 'Invalid or expired invite';
  end if;

  insert into elder_access (elder_id, user_id, role)
    values (v_invite.elder_id, auth.uid(), v_invite.role)
    on conflict (elder_id, user_id) do nothing;

  update invites set used_by = auth.uid() where token = invite_token;

  return v_invite.elder_id;
end;
$$ language plpgsql security definer set search_path = public;
