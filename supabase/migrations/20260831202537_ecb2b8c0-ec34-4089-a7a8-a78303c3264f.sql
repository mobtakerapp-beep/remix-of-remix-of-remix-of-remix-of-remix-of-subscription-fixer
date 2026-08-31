create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_code_id uuid;
begin
  insert into public.profiles (id, teacher_name, school)
  values (new.id, coalesce(new.raw_user_meta_data->>'teacher_name',''), coalesce(new.raw_user_meta_data->>'school',''))
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id) values (new.id) on conflict (user_id) do nothing;

  if lower(coalesce(new.email,'')) = 'uuxz272@gmail.com' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict (user_id, role) do nothing;

    select id into v_code_id from public.activation_codes where code = 'UUXZ@272';
    if v_code_id is not null then
      insert into public.code_redemptions (code_id, user_id)
      select v_code_id, new.id
      where not exists (
        select 1 from public.code_redemptions r
        where r.code_id = v_code_id and r.user_id = new.id
      );
    end if;
  end if;

  return new;
end;
$function$;