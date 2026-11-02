-- New statuses, event types and columns
alter table public.students drop constraint students_status_check;
alter table public.students add constraint students_status_check check (status in ('pending','given','withdrawn','renewal'));
alter table public.students add column consent_notice text;
update public.students s set consent_notice = sc.notice_version from public.schools sc where sc.id = s.school_id and s.consent_at is not null;
alter table public.ledger drop constraint ledger_type_check;
alter table public.ledger add constraint ledger_type_check check (type in ('notice','drive','sent','remind','consent','update','withdraw','request','resolved','plan','import','breach','breachstep','vendor','team','pack'));

alter table public.school_staff
  add column role text not null default 'principal' check (role in ('principal','office','teacher','auditor')),
  add column classes text[] not null default '{}',
  add column name text not null default '',
  add column email text not null default '';
update public.school_staff st set email = coalesce(u.email, '') from auth.users u where u.id = st.user_id;

create table public.staff_invites (
  school_id uuid not null references public.schools(id) on delete cascade,
  email text not null, name text not null default '',
  role text not null check (role in ('principal','office','teacher','auditor')),
  classes text[] not null default '{}', created_at timestamptz not null default now(),
  primary key (school_id, email)
);
create table public.access_log (
  id bigint generated always as identity primary key,
  school_id uuid not null references public.schools(id) on delete cascade,
  at timestamptz not null default now(), actor text not null, role text not null default '',
  action text not null check (action in ('view','export','change')), sid text not null default '-', detail text not null default ''
);
create index on public.access_log(school_id, at desc);
create table public.packs (
  school_id uuid not null references public.schools(id) on delete cascade, id text not null, sid text not null,
  token_hash text not null unique, created_at timestamptz not null default now(), expires_at timestamptz not null,
  revoked_at timestamptz, created_by text not null default '',
  primary key (school_id, id)
);
grant select on public.staff_invites, public.access_log, public.packs to anon, authenticated;
grant all on public.staff_invites, public.access_log, public.packs to service_role;
grant select on public.school_staff to anon;
alter table public.staff_invites enable row level security;
alter table public.access_log enable row level security;
alter table public.packs enable row level security;

-- Role helpers. Demo school: everyone acts as Principal.
create or replace function public.my_role(_school uuid) returns text
language sql stable security definer set search_path = public as $$
  select case when exists (select 1 from public.schools where id = _school and is_demo) then 'principal'
    else (select role from public.school_staff where school_id = _school and user_id = auth.uid()) end
$$;
create or replace function public.can_access(_school uuid) returns boolean
language sql stable security definer set search_path = public as $$ select public.my_role(_school) is not null $$;
create or replace function public.can_write(_school uuid) returns boolean
language sql stable security definer set search_path = public as $$ select coalesce(public.my_role(_school) in ('principal','office'), false) $$;
create or replace function public.can_admin(_school uuid) returns boolean
language sql stable security definer set search_path = public as $$ select coalesce(public.my_role(_school) = 'principal', false) $$;
create or replace function public.my_classes(_school uuid) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce((select classes from public.school_staff where school_id = _school and user_id = auth.uid()), '{}') $$;
create or replace function public.can_see_cls(_school uuid, _cls text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(r in ('principal','office','auditor'), false) or (r = 'teacher' and _cls = any(public.my_classes(_school)))
  from (select public.my_role(_school) r) x $$;
create or replace function public.can_see_sid(_school uuid, _sid text) returns boolean
language sql stable security definer set search_path = public as $$
  select r is not null and (r in ('principal','office','auditor') or _sid = '-'
    or (r = 'teacher' and exists (select 1 from public.students s where s.id = _sid and s.school_id = _school and s.cls = any(public.my_classes(_school)))))
  from (select public.my_role(_school) r) x $$;

-- Policies, now role-aware
drop policy "read own or demo" on public.students;
drop policy "insert own or demo" on public.students;
drop policy "update own or demo" on public.students;
drop policy "read own or demo" on public.requests;
drop policy "insert own or demo" on public.requests;
drop policy "update own or demo" on public.requests;
drop policy "read own or demo" on public.breaches;
drop policy "insert own or demo" on public.breaches;
drop policy "update own or demo" on public.breaches;
drop policy "read own or demo" on public.vendors;
drop policy "insert own or demo" on public.vendors;
drop policy "update own or demo" on public.vendors;
drop policy "read own or demo school" on public.schools;
drop policy "edit own or demo school" on public.schools;
drop policy "read own or demo ledger" on public.ledger;

create policy "read by role" on public.students for select to anon, authenticated using (public.can_see_cls(school_id, cls));
create policy "write by office" on public.students for insert to anon, authenticated with check (public.can_write(school_id));
create policy "update by office" on public.students for update to anon, authenticated using (public.can_write(school_id)) with check (public.can_write(school_id));
create policy "read by role" on public.requests for select to anon, authenticated using (public.can_see_sid(school_id, sid));
create policy "write by office" on public.requests for insert to anon, authenticated with check (public.can_write(school_id));
create policy "update by office" on public.requests for update to anon, authenticated using (public.can_write(school_id)) with check (public.can_write(school_id));
create policy "read by staff" on public.breaches for select to anon, authenticated using (public.can_access(school_id));
create policy "write by principal" on public.breaches for insert to anon, authenticated with check (public.can_admin(school_id));
create policy "update by principal" on public.breaches for update to anon, authenticated using (public.can_admin(school_id)) with check (public.can_admin(school_id));
create policy "read by staff" on public.vendors for select to anon, authenticated using (public.can_access(school_id));
create policy "write by principal" on public.vendors for insert to anon, authenticated with check (public.can_admin(school_id));
create policy "update by principal" on public.vendors for update to anon, authenticated using (public.can_admin(school_id)) with check (public.can_admin(school_id));
create policy "read by staff" on public.schools for select to anon, authenticated using (public.can_access(id));
create policy "update by principal" on public.schools for update to anon, authenticated using (public.can_admin(id)) with check (public.can_admin(id));
create policy "read by role" on public.ledger for select to anon, authenticated using (public.can_see_sid(school_id, sid));
create policy "see school team" on public.school_staff for select to anon, authenticated using (public.can_access(school_id));
create policy "principal sees invites" on public.staff_invites for select to anon, authenticated using (public.can_admin(school_id));
create policy "principal and auditor read log" on public.access_log for select to anon, authenticated using (coalesce(public.my_role(school_id) in ('principal','auditor'), false));
create policy "office reads packs" on public.packs for select to anon, authenticated using (coalesce(public.my_role(school_id) in ('principal','office','auditor'), false));

-- Who is acting (for the access log)
create or replace function public._who(_school uuid) returns text[]
language plpgsql stable security definer set search_path = public as $$
declare st public.school_staff; a text := nullif(current_setting('sahmati.actor', true), '');
begin
  if a is not null then return array[a, coalesce(nullif(current_setting('sahmati.actor_role', true), ''), '')]; end if;
  select * into st from public.school_staff where school_id = _school and user_id = auth.uid();
  if found then return array[coalesce(nullif(st.name, ''), st.email), st.role]; end if;
  return array[case when auth.uid() is null then 'Demo visitor' else coalesce(auth.jwt()->>'email', 'Signed-in user') end, 'principal'];
end $$;
revoke all on function public._who(uuid) from public, anon, authenticated;

create or replace function public._log(_school uuid, _action text, _sid text, _detail text) returns void
language plpgsql security definer set search_path = public as $$
declare w text[]; cut bigint;
begin
  if current_setting('sahmati.seeding', true) = 'on' then return; end if;
  w := public._who(_school);
  insert into public.access_log(school_id, actor, role, action, sid, detail) values (_school, w[1], w[2], _action, coalesce(_sid, '-'), left(coalesce(_detail, ''), 500));
  if exists (select 1 from public.schools where id = _school and is_demo) then
    select id into cut from public.access_log where school_id = _school order by id desc offset 3000 limit 1;
    if cut is not null then delete from public.access_log where school_id = _school and id <= cut; end if;
  end if;
end $$;
revoke all on function public._log(uuid, text, text, text) from public, anon, authenticated;

create or replace function public.log_access(_school uuid, _action text, _sid text, _detail text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_access(_school) then raise exception 'Not allowed'; end if;
  if _action not in ('view', 'export') then raise exception 'Unknown action'; end if;
  perform public._log(_school, _action, coalesce(_sid, '-'), left(coalesce(_detail, ''), 200));
end $$;

-- Ledger append now also writes the access log ("who changed anything")
create or replace function public._append(_school uuid, _type text, _sid text, _detail text, _ts text default null)
returns public.ledger language plpgsql security definer set search_path = public as $$
declare last public.ledger; r public.ledger; n int;
begin
  perform pg_advisory_xact_lock(hashtextextended(_school::text, 0));
  select * into last from public.ledger where school_id = _school order by seq desc limit 1;
  n := coalesce(last.seq, 0) + 1;
  if n > 2000 and exists (select 1 from public.schools where id = _school and is_demo) then
    raise exception 'The demo ledger is limited to 2,000 records. Use Reset demo to start over.';
  end if;
  r.school_id := _school; r.seq := n; r.ts := coalesce(_ts, public.iso_now()); r.type := _type; r.sid := _sid; r.detail := _detail;
  r.prev := coalesce(last.hash, 'GENESIS');
  r.hash := encode(sha256(convert_to(concat_ws('|', r.prev, r.seq::text, r.ts, r.type, r.sid, r.detail), 'UTF8')), 'hex');
  insert into public.ledger values (r.*);
  perform public._log(_school, 'change', _sid, _detail);
  return r;
end $$;
revoke all on function public._append(uuid, text, text, text, text) from public, anon, authenticated;

create or replace function public.append_events(_school uuid, _events jsonb) returns setof public.ledger
language plpgsql security definer set search_path = public as $$
declare e jsonb; t text;
begin
  if not public.can_write(_school) then raise exception 'Your role can''t make changes here. Ask the Principal.'; end if;
  for e in select * from jsonb_array_elements(_events) loop
    t := e->>'type';
    if t in ('pack','team','consent','update','withdraw','request','import') then raise exception 'Not allowed'; end if;
    if t in ('notice','plan','breach','breachstep','vendor') and not public.can_admin(_school) then raise exception 'Only the Principal can do this.'; end if;
    return next public._append(_school, t, coalesce(e->>'sid', '-'), e->>'detail');
  end loop;
end $$;

create or replace function public.import_students(_school uuid, _rows jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare r jsonb; n int := 0; demo boolean; base int; new_id text;
begin
  if not public.can_write(_school) then raise exception 'Your role can''t make changes here. Ask the Principal.'; end if;
  select is_demo into demo from public.schools where id = _school;
  select count(*) into base from public.students where school_id = _school;
  for r in select * from jsonb_array_elements(_rows) loop
    n := n + 1;
    new_id := case when demo then 's' || lpad((base + n)::text, 3, '0') else 's' || substr(md5(gen_random_uuid()::text), 1, 12) end;
    insert into public.students(id, school_id, name, cls, sec, parent, phone, lang)
    values (new_id, _school, r->>'name', r->>'cls', coalesce(nullif(r->>'sec', ''), 'A'), r->>'parent', r->>'phone', case when r->>'lang' = 'hi' then 'hi' else 'en' end);
  end loop;
  perform public._append(_school, 'import', '-', n || ' students imported from spreadsheet');
  return n;
end $$;

-- Parent code limit: 20/hour for the demo school, 3 for real schools
create or replace function public.otp_issue(_sid text, _hash text, _ttl_seconds integer default 600) returns jsonb
language plpgsql security definer set search_path = public as $$
declare demo boolean; phone text; lim int;
begin
  select sc.is_demo, s.phone into demo, phone from public.students s join public.schools sc on sc.id = s.school_id where s.id = _sid;
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  lim := case when demo then 20 else 3 end;
  if (select count(*) from public.otp_codes where sid = _sid and created_at > now() - interval '1 hour') >= lim then
    return jsonb_build_object('ok', false, 'error', 'rate');
  end if;
  update public.otp_codes set void = true where sid = _sid and used_at is null and not void;
  insert into public.otp_codes(sid, code_hash, expires_at) values (_sid, _hash, now() + make_interval(secs => _ttl_seconds));
  return jsonb_build_object('ok', true, 'demo', demo, 'phone', phone);
end $$;
revoke all on function public.otp_issue(text, text, integer) from public, anon, authenticated;
grant execute on function public.otp_issue(text, text, integer) to service_role;

create or replace function public.give_consent(_sid text, _web boolean, _newsletter boolean, _code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.students; was boolean; ch text; o public.otp_codes; r public.ledger; nv text;
begin
  perform set_config('sahmati.actor', 'Parent (consent link)', true);
  perform set_config('sahmati.actor_role', 'parent', true);
  select * into s from public.students where id = _sid for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  select * into o from public.otp_codes where sid = _sid and used_at is null and not void order by created_at desc limit 1 for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'nocode'); end if;
  if o.expires_at < now() then
    update public.otp_codes set void = true where id = o.id;
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if o.code_hash <> public.otp_hash(_sid, coalesce(_code, '')) then
    update public.otp_codes set attempts = attempts + 1, void = (attempts + 1 >= 5) where id = o.id;
    return jsonb_build_object('ok', false, 'error', case when o.attempts + 1 >= 5 then 'locked' else 'bad' end);
  end if;
  update public.otp_codes set used_at = now() where id = o.id;
  select notice_version into nv from public.schools where id = s.school_id;
  was := s.status not in ('pending', 'renewal');
  update public.students set
    choices = jsonb_build_object('records', true, 'web', _web, 'newsletter', _newsletter),
    status = case when s.status <> 'pending' and not _web and not _newsletter then 'withdrawn' else 'given' end,
    consent_at = now(), consent_notice = nv,
    receipt = coalesce(receipt, 'SAH-' || substr(id, 2) || '-' || right(floor(extract(epoch from now()) * 1000)::bigint::text, 4))
  where id = _sid;
  ch := 'records yes, web ' || case when _web then 'yes' else 'no' end || ', newsletter ' || case when _newsletter then 'yes' else 'no' end;
  r := public._append(s.school_id, case when was then 'update' else 'consent' end, _sid,
    case when s.status = 'renewal' then 'Consent renewed (notice ' || nv || ')' when was then 'Consent updated' else 'Consent given' end || ', verified by OTP · ' || ch);
  return jsonb_build_object('ok', true, 'event', to_jsonb(r) - 'school_id');
end $$;

create or replace function public.parent_request(_sid text, _type text, _note text) returns void
language plpgsql security definer set search_path = public as $$
declare s public.students;
begin
  perform set_config('sahmati.actor', 'Parent (consent link)', true);
  perform set_config('sahmati.actor_role', 'parent', true);
  select * into s from public.students where id = _sid;
  if not found then raise exception 'This consent link is not valid'; end if;
  insert into public.requests(school_id, id, sid, type, note) values (s.school_id, 'r' || substr(md5(random()::text), 1, 8), _sid, _type, left(coalesce(_note, ''), 2000));
  perform public._append(s.school_id, 'request', _sid, 'Parent request: ' || _type);
end $$;

create or replace function public.create_school(_name text, _city text, _slug text, _dpo text) returns uuid
language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if exists (select 1 from public.school_staff where user_id = auth.uid()) then raise exception 'You already belong to a school'; end if;
  if exists (select 1 from public.schools where slug = lower(trim(_slug))) then raise exception 'That web address is taken. Try another.'; end if;
  insert into public.schools(name, city, slug, dpo) values (trim(_name), trim(_city), lower(trim(_slug)), trim(_dpo)) returning id into sid;
  insert into public.school_staff(school_id, user_id, role, email) values (sid, auth.uid(), 'principal', coalesce(auth.jwt()->>'email', ''));
  return sid;
end $$;
revoke execute on function public.create_school(text, text, text, text) from anon, public;
grant execute on function public.create_school(text, text, text, text) to authenticated;

-- Team
create or replace function public._role_label(_role text, _classes text[]) returns text
language sql immutable set search_path = public as $$
  select initcap(_role) || case when _role = 'teacher' and cardinality(_classes) > 0 then ' (Class ' || array_to_string(_classes, ', ') || ')' else '' end $$;

create or replace function public._clean_classes(_classes text[]) returns text[]
language sql immutable set search_path = public as $$
  select coalesce(array_agg(distinct c order by c), '{}') from (select trim(x) c from unnest(coalesce(_classes, '{}')) x) y where c <> '' $$;

create or replace function public.accept_invite() returns uuid
language plpgsql security definer set search_path = public as $$
declare em text := lower(coalesce(auth.jwt()->>'email', '')); i public.staff_invites; mine uuid;
begin
  if auth.uid() is null or em = '' then return null; end if;
  select school_id into mine from public.school_staff where user_id = auth.uid();
  if mine is not null then return mine; end if;
  select iv.* into i from public.staff_invites iv join public.schools sc on sc.id = iv.school_id where lower(iv.email) = em and not sc.is_demo order by iv.created_at limit 1;
  if not found then return null; end if;
  insert into public.school_staff(school_id, user_id, role, classes, name, email) values (i.school_id, auth.uid(), i.role, i.classes, i.name, em);
  delete from public.staff_invites where school_id = i.school_id and lower(email) = em;
  perform public._append(i.school_id, 'team', '-', 'Joined the team: ' || em || ' as ' || public._role_label(i.role, i.classes));
  return i.school_id;
end $$;
revoke execute on function public.accept_invite() from anon, public;
grant execute on function public.accept_invite() to authenticated;

create or replace function public.invite_staff(_school uuid, _email text, _name text, _role text, _classes text[]) returns void
language plpgsql security definer set search_path = public as $$
declare em text := lower(trim(coalesce(_email, ''))); cl text[] := public._clean_classes(_classes);
begin
  if not public.can_admin(_school) then raise exception 'Only the Principal can manage the team.'; end if;
  if _role not in ('principal','office','teacher','auditor') then raise exception 'Choose a role'; end if;
  if em !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'Enter a valid email address'; end if;
  if _role = 'teacher' and cardinality(cl) = 0 then raise exception 'Add the classes this teacher can see'; end if;
  if exists (select 1 from public.school_staff where school_id = _school and lower(email) = em) then raise exception 'That person is already on the team.'; end if;
  insert into public.staff_invites(school_id, email, name, role, classes) values (_school, em, left(trim(coalesce(_name, '')), 80), _role, case when _role = 'teacher' then cl else '{}' end)
  on conflict (school_id, email) do update set name = excluded.name, role = excluded.role, classes = excluded.classes, created_at = now();
  perform public._append(_school, 'team', '-', 'Invited ' || em || ' as ' || public._role_label(_role, case when _role = 'teacher' then cl else '{}' end));
end $$;

create or replace function public.cancel_invite(_school uuid, _email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_admin(_school) then raise exception 'Only the Principal can manage the team.'; end if;
  delete from public.staff_invites where school_id = _school and email = lower(trim(_email));
  if found then perform public._append(_school, 'team', '-', 'Invite cancelled: ' || lower(trim(_email))); end if;
end $$;

create or replace function public.set_staff_role(_school uuid, _user uuid, _role text, _classes text[]) returns void
language plpgsql security definer set search_path = public as $$
declare st public.school_staff; cl text[] := public._clean_classes(_classes); np int;
begin
  if not public.can_admin(_school) then raise exception 'Only the Principal can manage the team.'; end if;
  if _role not in ('principal','office','teacher','auditor') then raise exception 'Choose a role'; end if;
  if _role = 'teacher' and cardinality(cl) = 0 then raise exception 'Add the classes this teacher can see'; end if;
  select * into st from public.school_staff where school_id = _school and user_id = _user for update;
  if not found then raise exception 'Not on this team'; end if;
  select count(*) into np from public.school_staff where school_id = _school and role = 'principal';
  if st.role = 'principal' and _role <> 'principal' and np <= 1 then raise exception 'Keep at least one Principal on the team.'; end if;
  update public.school_staff set role = _role, classes = case when _role = 'teacher' then cl else '{}' end where school_id = _school and user_id = _user;
  perform public._append(_school, 'team', '-', 'Role changed: ' || coalesce(nullif(st.name, ''), st.email) || ' is now ' || public._role_label(_role, case when _role = 'teacher' then cl else '{}' end));
end $$;

create or replace function public.remove_staff(_school uuid, _user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare st public.school_staff; np int;
begin
  if not public.can_admin(_school) then raise exception 'Only the Principal can manage the team.'; end if;
  select * into st from public.school_staff where school_id = _school and user_id = _user for update;
  if not found then raise exception 'Not on this team'; end if;
  select count(*) into np from public.school_staff where school_id = _school and role = 'principal';
  if st.role = 'principal' and np <= 1 then raise exception 'Keep at least one Principal on the team.'; end if;
  delete from public.school_staff where school_id = _school and user_id = _user;
  perform public._append(_school, 'team', '-', 'Removed from team: ' || coalesce(nullif(st.name, ''), st.email));
end $$;

-- Parent data packs: random token, stored as sha256 only, 7-day expiry, revocable
create or replace function public.create_pack(_school uuid, _sid text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare tok text; pid text; exp timestamptz := now() + interval '7 days';
begin
  if not public.can_write(_school) then raise exception 'Your role can''t share data packs.'; end if;
  if not exists (select 1 from public.students where id = _sid and school_id = _school) then raise exception 'Student not found'; end if;
  tok := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  pid := 'k' || substr(md5(tok || clock_timestamp()::text), 1, 10);
  insert into public.packs(school_id, id, sid, token_hash, expires_at, created_by)
  values (_school, pid, _sid, encode(sha256(convert_to(tok, 'UTF8')), 'hex'), exp, (public._who(_school))[1]);
  perform public._append(_school, 'pack', _sid, 'Data pack shared with parent');
  return jsonb_build_object('id', pid, 'token', tok, 'expiresAt', exp);
end $$;

create or replace function public.revoke_pack(_school uuid, _id text) returns void
language plpgsql security definer set search_path = public as $$
declare p public.packs;
begin
  if not public.can_write(_school) then raise exception 'Your role can''t change data packs.'; end if;
  update public.packs set revoked_at = now() where school_id = _school and id = _id and revoked_at is null returning * into p;
  if p.id is not null then perform public._append(_school, 'pack', p.sid, 'Data pack link revoked'); end if;
end $$;

create or replace function public.pack_view(_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.packs; s public.students; sc public.schools;
begin
  select * into p from public.packs where token_hash = encode(sha256(convert_to(coalesce(_token, ''), 'UTF8')), 'hex');
  if not found then return jsonb_build_object('ok', false, 'error', 'notfound'); end if;
  if p.revoked_at is not null or p.expires_at < now() then return jsonb_build_object('ok', false, 'error', 'expired'); end if;
  select * into s from public.students where id = p.sid;
  select * into sc from public.schools where id = p.school_id;
  perform set_config('sahmati.actor', 'Parent (data pack link)', true);
  perform set_config('sahmati.actor_role', 'parent', true);
  perform public._log(p.school_id, 'view', p.sid, 'Parent opened data pack');
  return jsonb_build_object('ok', true, 'createdAt', p.created_at, 'expiresAt', p.expires_at,
    'school', jsonb_build_object('name', sc.name, 'city', sc.city, 'slug', sc.slug, 'noticeVersion', sc.notice_version, 'dpo', sc.dpo),
    'student', jsonb_build_object('id', s.id, 'name', s.name, 'cls', s.cls, 'sec', s.sec, 'parent', s.parent,
      'phone', left(s.phone, 2) || 'XXXX' || right(s.phone, 4), 'lang', s.lang, 'status', s.status, 'choices', s.choices,
      'consentAt', s.consent_at, 'receipt', s.receipt, 'noticeAt', s.consent_notice),
    'events', (select coalesce(jsonb_agg(to_jsonb(l) - 'school_id' order by l.seq), '[]') from public.ledger l where l.school_id = p.school_id and l.sid = p.sid),
    'requests', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'sid', r.sid, 'type', r.type, 'note', r.note, 'createdAt', r.created_at, 'status', r.status, 'doneAt', r.done_at) order by r.created_at), '[]') from public.requests r where r.school_id = p.school_id and r.sid = p.sid),
    'vendors', (select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'role', v.role, 'data', v.data, 'dpa', v.dpa, 'signedAt', v.signed_at, 'review', v.review) order by v.id), '[]') from public.vendors v where v.school_id = p.school_id));
end $$;

-- Public DPDP Ready page: no student data, only school-level steps
create or replace function public.public_school(_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('name', sc.name, 'city', sc.city, 'slug', sc.slug, 'dpo', sc.dpo, 'noticeVersion', sc.notice_version,
    'updatedAt', (select max(ts) from public.ledger where school_id = sc.id),
    'checks', jsonb_build_array(
      jsonb_build_object('title', 'Privacy notice published', 'ok', sc.notice_version <> ''),
      jsonb_build_object('title', 'Consent drive running on WhatsApp', 'ok', exists (select 1 from public.ledger where school_id = sc.id and type in ('sent','drive'))),
      jsonb_build_object('title', 'Consent recorded for 90% of students', 'ok', coalesce((select count(*) filter (where status <> 'pending')::numeric / nullif(count(*), 0) >= 0.9 from public.students where school_id = sc.id), false)),
      jsonb_build_object('title', 'Parent requests answered in 7 days', 'ok', not exists (select 1 from public.requests where school_id = sc.id and status = 'open' and created_at < now() - interval '7 days')),
      jsonb_build_object('title', '72-hour breach plan on file', 'ok', sc.breach_plan),
      jsonb_build_object('title', 'No open breach past 72 hours', 'ok', not exists (select 1 from public.breaches where school_id = sc.id and status = 'open' and steps->>3 is null and discovered_at + interval '72 hours' < now())),
      jsonb_build_object('title', 'Every vendor has a signed DPA', 'ok', exists (select 1 from public.vendors where school_id = sc.id) and not exists (select 1 from public.vendors where school_id = sc.id and dpa <> 'signed')),
      jsonb_build_object('title', 'Staff access limited by role', 'ok', exists (select 1 from public.school_staff where school_id = sc.id and role <> 'principal'))))
  from public.schools sc where sc.slug = lower(trim(_slug))
$$;

-- Consent renewal drives
create or replace function public.start_renewal(_school uuid, _kind text, _since timestamptz) returns integer
language plpgsql security definer set search_path = public as $$
declare nv text; asked int; label text;
begin
  if not public.can_write(_school) then raise exception 'Your role can''t start a consent drive.'; end if;
  select notice_version into nv from public.schools where id = _school;
  if _kind = 'year' then
    select count(*) into asked from public.students where school_id = _school;
    update public.students set status = 'renewal' where school_id = _school and status in ('given','withdrawn');
    label := 'New academic year';
  elsif _kind = 'admissions' then
    if _since is null then raise exception 'Choose a date'; end if;
    select count(*) into asked from public.students where school_id = _school and created_at >= _since;
    update public.students set status = 'renewal' where school_id = _school and created_at >= _since and status in ('given','withdrawn');
    label := 'New admissions since ' || to_char(_since at time zone 'Asia/Kolkata', 'DD Mon YYYY');
  elsif _kind = 'notice' then
    update public.students set status = 'renewal' where school_id = _school and status in ('given','withdrawn') and coalesce(consent_notice, '') <> nv;
    get diagnostics asked = row_count;
    label := 'Notice changed to ' || nv;
  else raise exception 'Unknown drive'; end if;
  perform public._append(_school, 'drive', '-', 'Consent renewal drive · ' || label || ' · ' || asked || ' parents asked');
  return asked;
end $$;

-- Demo seed now also restores sample staff and access log rows
create or replace function public._seed_demo() returns void
language plpgsql security definer set search_path = public as $$
declare d jsonb; sc uuid; e jsonb;
begin
  perform set_config('sahmati.seeding', 'on', true);
  select data into d from public.demo_seed where id = 1;
  select id into sc from public.schools where is_demo limit 1;
  if sc is null then
    insert into public.schools(name, city, slug, notice_version, breach_plan, dpo, is_demo)
    values (d#>>'{school,name}', d#>>'{school,city}', d#>>'{school,slug}', d#>>'{school,noticeVersion}', false, d#>>'{school,dpo}', true) returning id into sc;
  else
    perform set_config('sahmati.demo_reset', 'on', true);
    delete from public.ledger where school_id = sc;
    delete from public.students where school_id = sc;
    delete from public.requests where school_id = sc;
    delete from public.breaches where school_id = sc;
    delete from public.vendors where school_id = sc;
    delete from public.packs where school_id = sc;
    delete from public.access_log where school_id = sc;
    delete from public.staff_invites where school_id = sc;
    delete from public.school_staff where school_id = sc;
    perform set_config('sahmati.demo_reset', 'off', true);
    update public.schools set name = d#>>'{school,name}', city = d#>>'{school,city}', notice_version = d#>>'{school,noticeVersion}', breach_plan = false, dpo = d#>>'{school,dpo}' where id = sc;
  end if;
  insert into public.students(id, school_id, name, cls, sec, parent, phone, lang, status, choices, sent_at, consent_at, receipt, consent_notice, created_at)
  select x->>'id', sc, x->>'name', x->>'cls', x->>'sec', x->>'parent', x->>'phone', x->>'lang', x->>'status', x->'choices', (x->>'sentAt')::timestamptz, (x->>'consentAt')::timestamptz, x->>'receipt',
    case when x->>'consentAt' is null then null when (x->>'consentAt')::timestamptz < '2026-10-21T00:00:00+05:30' then 'v1' else d#>>'{school,noticeVersion}' end,
    case when x->>'id' > 's026' then '2026-10-12T10:00:00+05:30'::timestamptz else '2026-04-01T10:00:00+05:30'::timestamptz end
  from jsonb_array_elements(d->'students') x;
  insert into public.requests(school_id, id, sid, type, note, created_at, status)
  select sc, x->>'id', x->>'sid', x->>'type', x->>'note', (x->>'createdAt')::timestamptz, x->>'status' from jsonb_array_elements(d->'requests') x;
  insert into public.breaches(school_id, id, what, discovered_at, data, count, cause, created_at, steps, status)
  select sc, x->>'id', x->>'what', (x->>'discoveredAt')::timestamptz, x->'data', (x->>'count')::int, x->>'cause', (x->>'createdAt')::timestamptz, x->'steps', x->>'status' from jsonb_array_elements(d->'breaches') x;
  insert into public.vendors(school_id, id, name, role, data, dpa, signed_at, review)
  select sc, x->>'id', x->>'name', x->>'role', x->'data', x->>'dpa', (x->>'signedAt')::timestamptz, (x->>'review')::timestamptz from jsonb_array_elements(d->'vendors') x;
  for e in select * from jsonb_array_elements(d->'events') loop
    perform public._append(sc, e->>'type', e->>'sid', e->>'detail', e->>'ts');
  end loop;
  insert into public.school_staff(school_id, user_id, role, classes, name, email, created_at) values
    (sc, '00000000-0000-4000-8000-000000000001', 'principal', '{}', 'Mrs. R. Kapoor', 'r.kapoor@greenvalley.example', '2026-04-01T09:00:00+05:30'),
    (sc, '00000000-0000-4000-8000-000000000002', 'office', '{}', 'Mr. Arun Mehta', 'arun.mehta@greenvalley.example', '2026-04-02T09:00:00+05:30'),
    (sc, '00000000-0000-4000-8000-000000000003', 'teacher', '{6,7,8}', 'Ms. Neha Iyer', 'neha.iyer@greenvalley.example', '2026-04-02T09:30:00+05:30'),
    (sc, '00000000-0000-4000-8000-000000000004', 'auditor', '{}', 'External auditor', 'audit@dpdp-review.example', '2026-10-01T09:00:00+05:30');
  insert into public.access_log(school_id, at, actor, role, action, sid, detail) values
    (sc, now() - interval '6 days 3 hours', 'Mr. Arun Mehta', 'office', 'change', '-', 'Reminder sent to pending parents'),
    (sc, now() - interval '5 days 2 hours', 'Ms. Neha Iyer', 'teacher', 'view', 's010', 'Viewed student record'),
    (sc, now() - interval '4 days 6 hours', 'Mrs. R. Kapoor', 'principal', 'export', '-', 'Exported consent ledger CSV'),
    (sc, now() - interval '3 days 5 hours', 'Mr. Arun Mehta', 'office', 'view', 's002', 'Viewed data pack'),
    (sc, now() - interval '3 days 4 hours', 'Mr. Arun Mehta', 'office', 'change', 's002', 'Data pack shared with parent'),
    (sc, now() - interval '2 days 8 hours', 'External auditor', 'auditor', 'view', '-', 'Viewed compliance report'),
    (sc, now() - interval '2 days 7 hours', 'External auditor', 'auditor', 'view', 's011', 'Viewed student record'),
    (sc, now() - interval '1 day 2 hours', 'Ms. Neha Iyer', 'teacher', 'view', 's025', 'Viewed student record'),
    (sc, now() - interval '20 hours', 'Mrs. R. Kapoor', 'principal', 'change', '-', 'Vendor added: Kapoor Studio · DPA missing'),
    (sc, now() - interval '3 hours', 'Mr. Arun Mehta', 'office', 'view', 's003', 'Viewed student record');
  perform set_config('sahmati.seeding', 'off', true);
end $$;
revoke all on function public._seed_demo() from public, anon, authenticated;

select public._seed_demo();

alter publication supabase_realtime add table public.school_staff, public.staff_invites, public.access_log, public.packs;