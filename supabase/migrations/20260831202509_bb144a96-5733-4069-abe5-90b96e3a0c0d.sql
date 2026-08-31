insert into public.activation_codes (code, plan, duration_days, max_uses, note, active, expires_at)
values ('UUXZ@272', 'pro', 3650, 100000, 'Admin master serial', true, null)
on conflict do nothing;

insert into public.code_redemptions (code_id, user_id)
select c.id, u.id
from public.activation_codes c
cross join auth.users u
where c.code = 'UUXZ@272'
  and lower(u.email) = 'uuxz272@gmail.com'
  and not exists (
    select 1 from public.code_redemptions r
    where r.code_id = c.id and r.user_id = u.id
  );