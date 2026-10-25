alter table public.profiles add column if not exists user_code text unique;
create sequence if not exists public.user_code_seq;

with o as (select id, row_number() over (order by created_at) n from public.profiles)
update public.profiles p set user_code = 'U' || lpad(o.n::text, 2, '0') from o where o.id = p.id and p.user_code is null;
select setval('public.user_code_seq', greatest((select count(*) from public.profiles), 1), (select count(*) from public.profiles) > 0);

create or replace function public.profiles_before_write()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if tg_op = 'INSERT' then
    if new.user_code is null then new.user_code := 'U' || lpad(nextval('public.user_code_seq')::text, 2, '0'); end if;
  else
    new.user_code := old.user_code;
  end if;
  return new;
end $$;
drop trigger if exists profiles_before_write on public.profiles;
create trigger profiles_before_write before insert or update on public.profiles for each row execute function public.profiles_before_write();

alter table public.weights drop constraint weights_animal_id_fkey,
  add constraint weights_animal_id_fkey foreign key (animal_id) references public.animals(id) on delete cascade on update cascade;
alter table public.vaccinations drop constraint vaccinations_animal_id_fkey,
  add constraint vaccinations_animal_id_fkey foreign key (animal_id) references public.animals(id) on delete cascade on update cascade;

create or replace function public.animals_before_write()
returns trigger language plpgsql set search_path to 'public' as $function$
declare pfx text; ucode text; n int;
begin
  if new.status not in ('Active','Sold','Discharged','Dead') then
    raise exception 'Invalid status %', new.status;
  end if;
  if tg_op = 'INSERT' and (new.id is null or new.id = '') then
    select coalesce(nullif(code,''), upper(left(name,1)), 'A') into pfx from public.categories where id = new.category_id;
    select user_code into ucode from public.profiles where id = new.user_id;
    ucode := coalesce(ucode, 'U00');
    perform pg_advisory_xact_lock(hashtext(ucode || '-' || pfx));
    select coalesce(max(substring(id from length(ucode || '-' || pfx) + 1)::int), 0) + 1 into n
      from public.animals where id ~ ('^' || ucode || '-' || pfx || '[0-9]+$');
    new.id := ucode || '-' || pfx || lpad(n::text, 4, '0');
  end if;
  if tg_op = 'UPDATE' then new.user_id := old.user_id; end if;
  new.updated_at := now();
  return new;
end $function$;

create or replace function public.animal_owner_info(_animal_id text)
returns table(registered_by text, user_code text, owner_name text)
language sql stable security definer set search_path to 'public' as $$
  select p.full_name, p.user_code, c.name
  from public.animals a
  left join public.profiles p on p.id = a.user_id
  left join public.customers c on c.id = a.owner_id
  where a.id = _animal_id and auth.uid() is not null
$$;
revoke execute on function public.animal_owner_info(text) from public, anon;
grant execute on function public.animal_owner_info(text) to authenticated;

update public.animals a set id = p.user_code || '-' || a.id
from public.profiles p where p.id = a.user_id and a.id !~ '-';
update public.animals set id = regexp_replace(id, 'B0002$', 'B0001')
where id like '%-B0002' and not exists (select 1 from public.animals x where x.id like '%-B0001');