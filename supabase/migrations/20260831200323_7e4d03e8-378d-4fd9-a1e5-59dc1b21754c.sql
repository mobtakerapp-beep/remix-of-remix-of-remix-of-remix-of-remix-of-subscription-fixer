-- roles
create type public.app_role as enum ('admin','moderator','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  teacher_name text not null default '',
  school text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- subscriptions
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'active',
  generations_used integer not null default 0,
  reset_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "own subscription select" on public.subscriptions for select to authenticated using (auth.uid() = user_id);
create policy "own subscription update" on public.subscriptions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- saved lessons
create table public.user_lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  package jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index user_lessons_user_idx on public.user_lessons(user_id, updated_at desc);
grant select, insert, update, delete on public.user_lessons to authenticated;
grant all on public.user_lessons to service_role;
alter table public.user_lessons enable row level security;
create policy "own lessons" on public.user_lessons for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- shares
create table public.lesson_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  package jsonb not null,
  token text not null unique,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.lesson_shares to authenticated;
grant all on public.lesson_shares to service_role;
alter table public.lesson_shares enable row level security;
create policy "own shares" on public.lesson_shares for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- activation codes
create table public.activation_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  plan text not null,
  duration_days integer not null default 30,
  max_uses integer not null default 1,
  used_count integer not null default 0,
  note text,
  active boolean not null default true,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);
grant select on public.activation_codes to authenticated;
grant all on public.activation_codes to service_role;
alter table public.activation_codes enable row level security;
create policy "admins manage codes" on public.activation_codes for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.code_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.activation_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_fingerprint text,
  created_at timestamptz not null default now(),
  unique (code_id, user_id)
);
grant select on public.code_redemptions to authenticated;
grant all on public.code_redemptions to service_role;
alter table public.code_redemptions enable row level security;
create policy "own redemptions select" on public.code_redemptions for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

-- new user bootstrap
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, teacher_name, school)
  values (new.id, coalesce(new.raw_user_meta_data->>'teacher_name',''), coalesce(new.raw_user_meta_data->>'school',''))
  on conflict (id) do nothing;
  insert into public.subscriptions (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();