create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid(),
  name text not null,
  parent_id uuid references public.categories(id) on delete cascade,
  code text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "read categories" on public.categories for select to authenticated using (true);
create policy "insert own categories" on public.categories for insert to authenticated with check (user_id = auth.uid());
create policy "update own categories" on public.categories for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own categories" on public.categories for delete to authenticated using (user_id = auth.uid());

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  phone text not null default '',
  village text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;
create policy "own customers" on public.customers for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create sequence public.animal_tag_seq start 1;
grant usage on sequence public.animal_tag_seq to authenticated;

create table public.animals (
  id text primary key,
  user_id uuid not null default auth.uid(),
  category_id uuid not null references public.categories(id),
  subcategory_id uuid references public.categories(id) on delete set null,
  breed text not null default '',
  owner_id uuid references public.customers(id) on delete set null,
  status text not null default 'Active',
  arrival date not null default current_date,
  sold_date date,
  sold_price numeric,
  monthly_charge numeric not null default 0,
  notes text not null default '',
  photo_url text,
  vaccine_due date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.animals to authenticated;
grant all on public.animals to service_role;
alter table public.animals enable row level security;
create policy "anyone signed in can view animals" on public.animals for select to authenticated using (true);
create policy "insert own animals" on public.animals for insert to authenticated with check (user_id = auth.uid());
create policy "update own animals" on public.animals for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own animals" on public.animals for delete to authenticated using (user_id = auth.uid());

create or replace function public.animals_before_write()
returns trigger language plpgsql set search_path = public as $$
declare pfx text;
begin
  if new.status not in ('Active','Sold','Discharged','Dead') then
    raise exception 'Invalid status %', new.status;
  end if;
  if tg_op = 'INSERT' and (new.id is null or new.id = '') then
    select coalesce(nullif(code,''), upper(left(name,1))) into pfx from public.categories where id = new.category_id;
    new.id := coalesce(pfx,'A') || lpad(nextval('public.animal_tag_seq')::text, 4, '0');
  end if;
  if tg_op = 'UPDATE' then new.user_id := old.user_id; end if;
  new.updated_at := now();
  return new;
end $$;
create trigger animals_before_write before insert or update on public.animals
  for each row execute function public.animals_before_write();

create or replace function public.owns_animal(_animal_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.animals where id = _animal_id and user_id = auth.uid())
$$;

create table public.weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  animal_id text not null references public.animals(id) on delete cascade on update cascade,
  date date not null default current_date,
  kg numeric not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.weights to authenticated;
grant all on public.weights to service_role;
alter table public.weights enable row level security;
create policy "view weights" on public.weights for select to authenticated using (true);
create policy "write own weights" on public.weights for all to authenticated
  using (public.owns_animal(animal_id)) with check (user_id = auth.uid() and public.owns_animal(animal_id));

create table public.vaccinations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  animal_id text not null references public.animals(id) on delete cascade on update cascade,
  name text not null,
  date date not null default current_date,
  next_due date,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.vaccinations to authenticated;
grant all on public.vaccinations to service_role;
alter table public.vaccinations enable row level security;
create policy "view vaccinations" on public.vaccinations for select to authenticated using (true);
create policy "write own vaccinations" on public.vaccinations for all to authenticated
  using (public.owns_animal(animal_id)) with check (user_id = auth.uid() and public.owns_animal(animal_id));

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  amount numeric not null,
  date date not null default current_date,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "own payments" on public.payments for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "animal photos read" on storage.objects for select to authenticated using (bucket_id = 'animal-photos');
create policy "animal photos owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'animal-photos' and public.owns_animal((storage.foldername(name))[1]));
create policy "animal photos owner update" on storage.objects for update to authenticated
  using (bucket_id = 'animal-photos' and public.owns_animal((storage.foldername(name))[1]));
create policy "animal photos owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'animal-photos' and public.owns_animal((storage.foldername(name))[1]));

insert into public.categories (id, user_id, name, code) values
  ('00000000-0000-0000-0000-000000000001',null,'Goat','G'),
  ('00000000-0000-0000-0000-000000000002',null,'Buffalo','B'),
  ('00000000-0000-0000-0000-000000000003',null,'Sheep','S'),
  ('00000000-0000-0000-0000-000000000004',null,'Cow','C');
insert into public.categories (user_id, name, parent_id) values
  (null,'Sirohi','00000000-0000-0000-0000-000000000001'),(null,'Jamunapari','00000000-0000-0000-0000-000000000001'),(null,'Barbari','00000000-0000-0000-0000-000000000001'),
  (null,'Murrah','00000000-0000-0000-0000-000000000002'),(null,'Jaffarabadi','00000000-0000-0000-0000-000000000002'),
  (null,'Deccani','00000000-0000-0000-0000-000000000003'),(null,'Marwari','00000000-0000-0000-0000-000000000003'),
  (null,'Gir','00000000-0000-0000-0000-000000000004'),(null,'Sahiwal','00000000-0000-0000-0000-000000000004');