revoke all on public.schools, public.school_staff, public.students, public.ledger, public.requests, public.breaches, public.vendors, public.leads, public.demo_seed, public.user_roles from anon, authenticated;
grant select on public.schools, public.students, public.ledger, public.requests, public.breaches, public.vendors to anon, authenticated;
grant update on public.schools to anon, authenticated;
grant insert, update on public.students, public.requests, public.breaches, public.vendors to anon, authenticated;
grant select on public.school_staff, public.user_roles to authenticated;
grant insert on public.leads to anon, authenticated;
grant select on public.leads to authenticated;
revoke execute on function public.reset_demo() from public;
grant execute on function public.reset_demo() to anon, authenticated;