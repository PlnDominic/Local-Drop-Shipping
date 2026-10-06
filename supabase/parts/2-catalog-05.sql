-- catalog-features.sql part 5 of 5. Run parts in order. Safe to re-run.
-- Keep one person's list to a sensible size.
create or replace function public.limit_saved_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.saved_items where user_id = new.user_id) >= 200 then
    raise exception 'You can save up to 200 items. Remove some to save more.';
  end if;
  return new;
end;
$$;

revoke all on function public.limit_saved_items() from public, anon, authenticated;

drop trigger if exists limit_saved_items on public.saved_items;
create trigger limit_saved_items
  before insert on public.saved_items
  for each row execute function public.limit_saved_items();

notify pgrst, 'reload schema';
