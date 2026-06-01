-- 0002_auth_bootstrap.sql
-- When a new user signs up, give them a company and an owner membership.
-- Without this, a fresh user passes auth but RLS hides everything (no company yet).
--
-- The company name comes from the signup metadata field `company_name`
-- (we pass it from the signup form), falling back to their email.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_company_id uuid;
  cname text;
begin
  cname := coalesce(
    nullif(new.raw_user_meta_data ->> 'company_name', ''),
    split_part(new.email, '@', 1)
  );

  insert into companies (name) values (cname)
  returning id into new_company_id;

  insert into memberships (user_id, company_id, role)
  values (new.id, new_company_id, 'owner');

  return new;
end;
$$;

-- fire after a row is added to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
