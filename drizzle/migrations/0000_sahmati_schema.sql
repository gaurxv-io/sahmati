-- Sahmati: multi-school data on Supabase
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null, city text not null default '', slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  notice_version text not null default 'v1', breach_plan boolean not null default false, dpo text not null default '',
  is_demo boolean not null default false, created_at timestamptz not null default now()
);
create table public.school_staff (
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null unique, created_at timestamptz not null default now(),
  primary key (school_id, user_id)
);
create table public.students (
  id text primary key, school_id uuid not null references public.schools(id) on delete cascade,
  name text not null, cls text not null, sec text not null default 'A', parent text not null, phone text not null,
  lang text not null default 'en' check (lang in ('en','hi')),
  status text not null default 'pending' check (status in ('pending','given','withdrawn')),
  choices jsonb not null default '{"records":true,"web":false,"newsletter":false}',
  sent_at timestamptz, consent_at timestamptz, receipt text, created_at timestamptz not null default now()
);
create index on public.students(school_id);
create index on public.students(receipt);
create table public.ledger (
  school_id uuid not null references public.schools(id) on delete cascade,
  seq integer not null, ts text not null,
  type text not null check (type in ('notice','drive','sent','remind','consent','update','withdraw','request','resolved','plan','import','breach','breachstep','vendor')),
  sid text not null, detail text not null, prev text not null, hash text not null,
  primary key (school_id, seq)
);
create table public.requests (
  school_id uuid not null references public.schools(id) on delete cascade, id text not null,
  sid text not null, type text not null check (type in ('access','correct','delete')), note text not null default '',
  created_at timestamptz not null default now(), status text not null default 'open' check (status in ('open','done')), done_at timestamptz,
  primary key (school_id, id)
);
create table public.breaches (
  school_id uuid not null references public.schools(id) on delete cascade, id text not null,
  what text not null, discovered_at timestamptz not null, data jsonb not null default '[]', count integer not null default 0,
  cause text not null, created_at timestamptz not null default now(), steps jsonb not null default '[null,null,null,null,null,null]',
  status text not null default 'open' check (status in ('open','closed')),
  primary key (school_id, id)
);
create table public.vendors (
  school_id uuid not null references public.schools(id) on delete cascade, id text not null,
  name text not null, role text not null default '', data jsonb not null default '[]',
  dpa text not null default 'missing' check (dpa in ('signed','sent','missing')), signed_at timestamptz, review timestamptz,
  primary key (school_id, id)
);
create table public.leads (
  id uuid primary key default gen_random_uuid(), name text not null, role text not null default '', school text not null default '',
  city text not null default '', phone text not null default '', size text not null default '', score integer, gaps jsonb,
  at timestamptz not null default now()
);
create table public.demo_seed (id int primary key default 1, data jsonb not null);
create type public.app_role as enum ('admin');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null, role public.app_role not null, unique (user_id, role));

grant select on public.schools, public.students, public.ledger, public.requests, public.breaches, public.vendors to anon, authenticated;
grant update on public.schools to anon, authenticated;
grant insert, update on public.students, public.requests, public.breaches, public.vendors to anon, authenticated;
grant select on public.school_staff, public.user_roles to authenticated;
grant insert on public.leads to anon, authenticated;
grant select on public.leads to authenticated;
grant all on public.schools, public.school_staff, public.students, public.ledger, public.requests, public.breaches, public.vendors, public.leads, public.demo_seed, public.user_roles to service_role;

alter table public.schools enable row level security;
alter table public.school_staff enable row level security;
alter table public.students enable row level security;
alter table public.ledger enable row level security;
alter table public.requests enable row level security;
alter table public.breaches enable row level security;
alter table public.vendors enable row level security;
alter table public.leads enable row level security;
alter table public.demo_seed enable row level security;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role) returns boolean
language sql stable security definer set search_path = public as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.can_access(_school uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.schools where id = _school and is_demo)
      or exists (select 1 from public.school_staff where school_id = _school and user_id = auth.uid())
$$;

create policy "read own or demo school" on public.schools for select to anon, authenticated using (public.can_access(id));
create policy "edit own or demo school" on public.schools for update to anon, authenticated using (public.can_access(id)) with check (public.can_access(id));
create policy "see own membership" on public.school_staff for select to authenticated using (user_id = auth.uid());
create policy "see own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());
do $$ declare t text; begin
  foreach t in array array['students','requests','breaches','vendors'] loop
    execute format('create policy "read own or demo" on public.%I for select to anon, authenticated using (public.can_access(school_id))', t);
    execute format('create policy "insert own or demo" on public.%I for insert to anon, authenticated with check (public.can_access(school_id))', t);
    execute format('create policy "update own or demo" on public.%I for update to anon, authenticated using (public.can_access(school_id)) with check (public.can_access(school_id))', t);
  end loop;
end $$;
create policy "read own or demo ledger" on public.ledger for select to anon, authenticated using (public.can_access(school_id));
create policy "anyone can send a lead" on public.leads for insert to anon, authenticated with check (true);
create policy "staff admins read leads" on public.leads for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.guard_school_update() returns trigger language plpgsql set search_path = public as $$
begin new.id := old.id; new.slug := old.slug; new.is_demo := old.is_demo; new.created_at := old.created_at; return new; end $$;
create trigger schools_guard before update on public.schools for each row execute function public.guard_school_update();
create or replace function public.guard_student_update() returns trigger language plpgsql set search_path = public as $$
begin new.id := old.id; new.school_id := old.school_id; return new; end $$;
create trigger students_guard before update on public.students for each row execute function public.guard_student_update();

create or replace function public.ledger_immutable() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' and current_setting('sahmati.demo_reset', true) = 'on'
     and exists (select 1 from public.schools where id = old.school_id and is_demo) then return old; end if;
  raise exception 'The consent ledger is append-only';
end $$;
create trigger ledger_no_update before update or delete on public.ledger for each row execute function public.ledger_immutable();
create trigger ledger_no_truncate before truncate on public.ledger for each statement execute function public.ledger_immutable();

create or replace function public.demo_student_cap() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.schools where id = new.school_id and is_demo)
     and (select count(*) from public.students where school_id = new.school_id) >= 200 then
    raise exception 'The demo school is limited to 200 students. Use Reset demo to start over.';
  end if; return new;
end $$;
create trigger students_demo_cap before insert on public.students for each row execute function public.demo_student_cap();

create or replace function public.iso_now() returns text language sql stable set search_path = public as $$ select to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') $$;

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
  return r;
end $$;
revoke all on function public._append(uuid, text, text, text, text) from public, anon, authenticated;

create or replace function public.append_events(_school uuid, _events jsonb) returns setof public.ledger
language plpgsql security definer set search_path = public as $$
declare e jsonb;
begin
  if not public.can_access(_school) then raise exception 'Not allowed'; end if;
  for e in select * from jsonb_array_elements(_events) loop
    return next public._append(_school, e->>'type', coalesce(e->>'sid', '-'), e->>'detail');
  end loop;
end $$;

create or replace function public.give_consent(_sid text, _web boolean, _newsletter boolean) returns public.ledger
language plpgsql security definer set search_path = public as $$
declare s public.students; was boolean; ch text;
begin
  select * into s from public.students where id = _sid for update;
  if not found then raise exception 'This consent link is not valid'; end if;
  was := s.status <> 'pending';
  update public.students set
    choices = jsonb_build_object('records', true, 'web', _web, 'newsletter', _newsletter),
    status = case when was and not _web and not _newsletter then 'withdrawn' else 'given' end,
    consent_at = now(),
    receipt = coalesce(receipt, 'SAH-' || substr(id, 2) || '-' || right(floor(extract(epoch from now()) * 1000)::bigint::text, 4))
  where id = _sid;
  ch := 'records yes, web ' || case when _web then 'yes' else 'no' end || ', newsletter ' || case when _newsletter then 'yes' else 'no' end;
  return public._append(s.school_id, case when was then 'update' else 'consent' end, _sid,
    case when was then 'Consent updated' else 'Consent given' end || ', verified by OTP · ' || ch);
end $$;

create or replace function public.parent_request(_sid text, _type text, _note text) returns void
language plpgsql security definer set search_path = public as $$
declare s public.students;
begin
  select * into s from public.students where id = _sid;
  if not found then raise exception 'This consent link is not valid'; end if;
  insert into public.requests(school_id, id, sid, type, note) values (s.school_id, 'r' || substr(md5(random()::text), 1, 8), _sid, _type, left(coalesce(_note, ''), 2000));
  perform public._append(s.school_id, 'request', _sid, 'Parent request: ' || _type);
end $$;

create or replace function public.parent_view(_sid text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'school', jsonb_build_object('name', sc.name, 'city', sc.city, 'slug', sc.slug, 'noticeVersion', sc.notice_version),
    'student', jsonb_build_object('id', s.id, 'name', s.name, 'cls', s.cls, 'sec', s.sec, 'parent', s.parent,
       'phone', left(s.phone, 2) || 'XXXX' || right(s.phone, 4), 'lang', s.lang, 'status', s.status, 'choices', s.choices,
       'consentAt', s.consent_at, 'receipt', s.receipt),
    'event', (select to_jsonb(l) - 'school_id' from public.ledger l where l.school_id = s.school_id and l.sid = s.id and l.type in ('consent','update','withdraw') order by seq desc limit 1))
  from public.students s join public.schools sc on sc.id = s.school_id where s.id = _sid
$$;

create or replace function public.chain_ok(_school uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare l public.ledger; prev text := 'GENESIS';
begin
  for l in select * from public.ledger where school_id = _school order by seq loop
    if l.prev <> prev or l.hash <> encode(sha256(convert_to(concat_ws('|', l.prev, l.seq::text, l.ts, l.type, l.sid, l.detail), 'UTF8')), 'hex') then return false; end if;
    prev := l.hash;
  end loop;
  return true;
end $$;
revoke execute on function public.chain_ok(uuid) from anon, authenticated, public;

create or replace function public.verify_receipt(_receipt text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('school', sc.name, 'student', jsonb_build_object('name', s.name, 'cls', s.cls, 'sec', s.sec, 'receipt', s.receipt),
    'event', (select to_jsonb(l) - 'school_id' from public.ledger l where l.school_id = s.school_id and l.sid = s.id and l.type in ('consent','update','withdraw') order by seq desc limit 1),
    'chainOk', public.chain_ok(s.school_id))
  from public.students s join public.schools sc on sc.id = s.school_id
  where upper(s.receipt) = upper(regexp_replace(_receipt, '^#', '')) limit 1
$$;

create or replace function public.import_students(_school uuid, _rows jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare r jsonb; n int := 0; demo boolean; base int; new_id text;
begin
  if not public.can_access(_school) then raise exception 'Not allowed'; end if;
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

create or replace function public.create_school(_name text, _city text, _slug text, _dpo text) returns uuid
language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if exists (select 1 from public.school_staff where user_id = auth.uid()) then raise exception 'You already belong to a school'; end if;
  if exists (select 1 from public.schools where slug = lower(trim(_slug))) then raise exception 'That web address is taken. Try another.'; end if;
  insert into public.schools(name, city, slug, dpo) values (trim(_name), trim(_city), lower(trim(_slug)), trim(_dpo)) returning id into sid;
  insert into public.school_staff(school_id, user_id) values (sid, auth.uid());
  return sid;
end $$;
revoke execute on function public.create_school(text, text, text, text) from anon, public;
grant execute on function public.create_school(text, text, text, text) to authenticated;

create or replace function public._seed_demo() returns void
language plpgsql security definer set search_path = public as $$
declare d jsonb; sc uuid; e jsonb;
begin
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
    perform set_config('sahmati.demo_reset', 'off', true);
    update public.schools set name = d#>>'{school,name}', city = d#>>'{school,city}', notice_version = d#>>'{school,noticeVersion}', breach_plan = false, dpo = d#>>'{school,dpo}' where id = sc;
  end if;
  insert into public.students(id, school_id, name, cls, sec, parent, phone, lang, status, choices, sent_at, consent_at, receipt)
  select x->>'id', sc, x->>'name', x->>'cls', x->>'sec', x->>'parent', x->>'phone', x->>'lang', x->>'status', x->'choices', (x->>'sentAt')::timestamptz, (x->>'consentAt')::timestamptz, x->>'receipt'
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
end $$;
revoke all on function public._seed_demo() from public, anon, authenticated;

create or replace function public.reset_demo() returns void language sql security definer set search_path = public as $$ select public._seed_demo() $$;

alter publication supabase_realtime add table public.schools, public.students, public.ledger, public.requests, public.breaches, public.vendors;

insert into public.demo_seed(id, data) values (1, $seed${"school":{"name":"Green Valley Public School","city":"New Delhi","slug":"greenvalley","noticeVersion":"v2","breachPlan":false,"dpo":"Mrs. R. Kapoor, Vice Principal"},
"students":[{"id":"s001","name":"Aarav Sharma","cls":"Nursery","sec":"A","parent":"Sunita Sharma","phone":"9000010101","lang":"hi","status":"pending","choices":{"records":true,"web":false,"newsletter":false},"sentAt":"2026-10-20T04:00:00.000Z","consentAt":null,"receipt":null},{"id":"s002","name":"Ananya Verma","cls":"LKG","sec":"B","parent":"Vikas Verma","phone":"9000010138","lang":"en","status":"given","choices":{"records":true,"web":true,"newsletter":true},"sentAt":"2026-10-20T04:08:00.000Z","consentAt":"2026-10-20T13:35:00.000Z","receipt":"SAH-002-LKGB"},{"id":"s003","name":"Vihaan Singh","cls":"UKG","sec":"A","parent":"Meena Singh","phone":"9000010175","lang":"en","status":"pending","choices":{"records":true,"web":false,"newsletter":false},"sentAt":"2026-10-20T04:22:00.000Z","consentAt":null,"receipt":null},{"id":"s004","name":"Diya Gupta","cls":"1","sec":"B","parent":"Kavita Gupta","phone":"9000010212","lang":"hi","status":"given","choices":{"records":true,"web":true,"newsletter":true},"sentAt":"2026-10-20T04:43:00.000Z","consentAt":"2026-10-20T15:39:00.000Z","receipt":"SAH-004-1B"},{"id":"s005","name":"Kabir Kumar","cls":"2","sec":"A","parent":"Suresh Kumar","phone":"9000010249","lang":"en","status":"pending","choices":{"records":true,"web":false,"newsletter":false},"sentAt":"2026-10-20T04:55:00.000Z","consentAt":null,"receipt":null},{"id":"s006","name":"Ira Yadav","cls":"3","sec":"B","parent":"Sanjay Yadav","phone":"9000010286","lang":"en","status":"given","choices":{"records":true,"web":true,"newsletter":false},"sentAt":"2026-10-20T05:14:00.000Z","consentAt":"2026-10-20T21:52:00.000Z","receipt":"SAH-006-3B"},{"id":"s007","name":"Arjun Mishra","cls":"4","sec":"A","parent":"Priya Mishra","phone":"9000010323","lang":"hi","status":"pending","choices":{"records":true,"web":false,"newsletter":false},"sentAt":"2026-10-20T05:19:00.000Z","consentAt":null,"receipt":null},{"id":"s008","name":"Saanvi Pandey","cls":"5","sec":"B","parent":"Neha Pandey","phone":"9000010360","lang":"en","status":"pending","choices":{"records":true,"web":false,"newsletter":false},"sentAt":"2026-10-20T05:27:00.000Z","consentAt":null,"receipt":null},{"id":"s009","name":"Reyansh Jha","cls":"6","sec":"A","parent":"Deepak Jha","phone":"9000010397","lang":"en","status":"pending","choices":{"records":true,"web":false,"newsletter":false},"sentAt":"2026-10-20T05:34:00.000Z","consentAt":null,"receipt":null},{"id":"s010","name":"Myra Sinha","cls":"7","sec":"B","parent":"Amit Sinha","phone":"9000010434","lang":"hi","status":"pending","choices":{"records":true,"web":false,"newsletter":false},"sentAt":"2026-10-20T05:47:00.000Z","consentAt":null,"receipt":null},{"id":"s011","name":"Ayaan Agarwal","cls":"8","sec":"A","parent":"Rekha Agarwal","phone":"9000010471","lang":"en","status":"given","choices":{"records":true,"web":true,"newsletter":true},"sentAt":"2026-10-20T05:52:00.000Z","consentAt":"2026-10-21T00:31:00.000Z","receipt":"SAH-011-8A"},{"id":"s012","name":"Kiara Chauhan","cls":"9","sec":"B","parent":"Pooja Chauhan","phone":"9000010508","lang":"en","status":"given","choices":{"records":true,"web":true,"newsletter":true},"sentAt":"2026-10-20T06:15:00.000Z","consentAt":"2026-10-21T05:35:00.000Z","receipt":"SAH-012-9B"},{"id":"s013","name":"Ishaan Khan","cls":"10","sec":"A","parent":"Manoj Khan","phone":"9000010545","lang":"hi","status":"pending","choices":{"records":true,"web":false,"newsletter":false},"sentAt":"2026-10-20T06:27:00.000Z","consentAt":null,"receipt":null},{"id":"s014","name":"Aadhya Das","cls":"11","sec":"B","parent":"Rajesh Das","phone":"9000010582","lang":"en","status":"withdrawn","choices":{"records":true,"web":false,"newsletter":false},"sentAt":"2026-10-20T06:34:00.000Z","consentAt":"2026-10-21T06:07:00.000Z","receipt":"SAH-014-11B"},{"id":"s015","name":"Rudra Rao","cls":"12","sec":"A","parent":"Anjali Rao","phone":"9000010619","lang":"en","status":"given","choices":{"records":true,"web":true,"newsletter":true},"sentAt":"2026-10-20T06:49:00.000Z","consentAt":"2026-10-21T07:12:00.000Z","receipt":"SAH-015-12A"},{"id":"s016","name":"Pari Sharma","cls":"Nursery","sec":"B","parent":"Sunita Sharma","phone":"9000010656","lang":"hi","status":"pending","choices":{"records":true,"web":false,"newsletter":false},"sentAt":"2026-10-20T06:58:00.000Z","consentAt":null,"receipt":null},{"id":"s017","name":"Dhruv Verma","cls":"LKG","sec":"A","parent":"Vikas Verma","phone":"9000010693","lang":"en","status":"given","choices":{"records":true,"web":false,"newsletter":true},"sentAt":"2026-10-20T07:21:00.000Z","consentAt":"2026-10-21T10:49:00.000Z","receipt":"SAH-017-LKGA"},{"id":"s018","name":"Anika Singh","cls":"UKG","sec":"B","parent":"Meena Singh","phone":"9000010730","lang":"en","status":"pending","choices":{"records":true,"web":false,"newsletter":false},"sentAt":"2026-10-20T07:29:00.000Z","consentAt":null,"receipt":null},{"id":"s019","name":"Vivaan Gupta","cls":"1","sec":"A","parent":"Kavita Gupta","phone":"9000010767","lang":"hi","status":"pending","choices":{"records":true,"web":false,"newsletter":false},"sentAt":"2026-10-20T07:39:00.000Z","consentAt":null,"receipt":null},{"id":"s020","name":"Navya Kumar","cls":"2","sec":"B","parent":"Suresh Kumar","phone":"9000010804","lang":"en","status":"pending","choices":{"records":true,"web":false,"newsletter":false},"sentAt":"2026-10-20T07:58:00.000Z","consentAt":null,"receipt":null},{"id":"s021","name":"Krish Yadav","cls":"3","sec":"A","parent":"Sanjay Yadav","phone":"9000010841","lang":"en","status":"given","choices":{"records":true,"web":true,"newsletter":true},"sentAt":"2026-10-20T08:09:00.000Z","consentAt":"2026-10-21T16:01:00.000Z","receipt":"SAH-021-3A"},{"id":"s022","name":"Riya Mishra","cls":"4","sec":"B","parent":"Priya Mishra","phone":"9000010878","lang":"hi","status":"given","choices":{"records":true,"web":false,"newsletter":false},"sentAt":"2026-10-20T08:31:00.000Z","consentAt":"2026-10-21T18:02:00.000Z","receipt":"SAH-022-4B"},{"id":"s023","name":"Atharv Pandey","cls":"5","sec":"A","parent":"Neha Pandey","phone":"9000010915","lang":"en","status":"pending","choices":{"records":true,"web":false,"newsletter":false},"sentAt":"2026-10-20T08:52:00.000Z","consentAt":null,"receipt":null},{"id":"s024","name":"Sara Jha","cls":"6","sec":"B","parent":"Deepak Jha","phone":"9000010952","lang":"en","status":"given","choices":{"records":true,"web":true,"newsletter":true},"sentAt":"2026-10-20T09:00:00.000Z","consentAt":"2026-10-21T18:40:00.000Z","receipt":"SAH-024-6B"},{"id":"s025","name":"Shaurya Sinha","cls":"7","sec":"A","parent":"Amit Sinha","phone":"9000010989","lang":"hi","status":"given","choices":{"records":true,"web":false,"newsletter":false},"sentAt":"2026-10-20T09:12:00.000Z","consentAt":"2026-10-21T20:08:00.000Z","receipt":"SAH-025-7A"},{"id":"s026","name":"Meera Agarwal","cls":"8","sec":"B","parent":"Rekha Agarwal","phone":"9000011026","lang":"en","status":"given","choices":{"records":true,"web":true,"newsletter":true},"sentAt":"2026-10-20T09:29:00.000Z","consentAt":"2026-10-21T23:53:00.000Z","receipt":"SAH-026-8B"},{"id":"s027","name":"Advik Chauhan","cls":"9","sec":"A","parent":"Pooja Chauhan","phone":"9000011063","lang":"en","status":"given","choices":{"records":true,"web":true,"newsletter":true},"sentAt":"2026-10-20T09:37:00.000Z","consentAt":"2026-10-22T02:21:00.000Z","receipt":"SAH-027-9A"},{"id":"s028","name":"Tara Khan","cls":"10","sec":"B","parent":"Manoj Khan","phone":"9000011100","lang":"hi","status":"pending","choices":{"records":true,"web":false,"newsletter":false},"sentAt":"2026-10-20T09:42:00.000Z","consentAt":null,"receipt":null},{"id":"s029","name":"Yash Das","cls":"11","sec":"A","parent":"Rajesh Das","phone":"9000011137","lang":"en","status":"given","choices":{"records":true,"web":true,"newsletter":true},"sentAt":"2026-10-20T09:54:00.000Z","consentAt":"2026-10-22T07:00:00.000Z","receipt":"SAH-029-11A"},{"id":"s030","name":"Zoya Rao","cls":"12","sec":"B","parent":"Anjali Rao","phone":"9000011174","lang":"en","status":"given","choices":{"records":true,"web":true,"newsletter":true},"sentAt":"2026-10-20T10:10:00.000Z","consentAt":"2026-10-22T10:41:00.000Z","receipt":"SAH-030-12B"}],
"requests":[{"id":"r001","sid":"s004","type":"access","note":"Please share what data you hold on my son.","createdAt":"2026-10-22T16:11:00.000Z","status":"open"},{"id":"r002","sid":"s009","type":"correct","note":"Address has changed to Sector 21, Dwarka.","createdAt":"2026-10-22T16:56:00.000Z","status":"open"},{"id":"r003","sid":"s021","type":"delete","note":"Remove old bus app photo.","createdAt":"2026-10-22T17:16:00.000Z","status":"done"}],
"breaches":[{"id":"b001","what":"Class 9 photo list shared in the wrong WhatsApp group","discoveredAt":"2026-10-03T10:50:00.000Z","data":["Names and classes","Photos"],"count":34,"cause":"Sent to the wrong person","createdAt":"2026-10-03T11:00:00.000Z","steps":["2026-10-03T11:35:00.000Z","2026-10-03T14:00:00.000Z","2026-10-04T05:30:00.000Z","2026-10-05T10:10:00.000Z","2026-10-07T06:30:00.000Z","2026-10-09T04:30:00.000Z"],"status":"closed"}],
"vendors":[{"id":"v001","name":"SchoolERP Cloud","role":"ERP","data":["All records"],"dpa":"signed","signedAt":"2026-06-12T05:30:00.000Z","review":"2027-06-12T05:30:00.000Z"},{"id":"v002","name":"SafeRide","role":"Bus tracking app","data":["Names","Phones","Addresses"],"dpa":"sent","signedAt":null,"review":null},{"id":"v003","name":"Kapoor Studio","role":"Annual photographer","data":["Photos"],"dpa":"missing","signedAt":null,"review":null},{"id":"v004","name":"Google Workspace","role":"Email and docs","data":["Names","Marks"],"dpa":"signed","signedAt":"2026-04-01T04:30:00.000Z","review":"2027-04-01T04:30:00.000Z"}],
"events":[{"ts":"2026-04-01T04:30:00.000Z","type":"vendor","sid":"-","detail":"Vendor added: Google Workspace · DPA signed"},{"ts":"2026-06-12T05:30:00.000Z","type":"vendor","sid":"-","detail":"Vendor added: SchoolERP Cloud · DPA signed"},{"ts":"2026-09-01T04:30:00.000Z","type":"vendor","sid":"-","detail":"Vendor added: SafeRide · DPA sent"},{"ts":"2026-09-01T04:30:00.000Z","type":"vendor","sid":"-","detail":"Vendor added: Kapoor Studio · DPA missing"},{"ts":"2026-10-03T11:00:00.000Z","type":"breach","sid":"-","detail":"Data breach logged · Sent to the wrong person · about 34 students"},{"ts":"2026-10-03T11:35:00.000Z","type":"breachstep","sid":"-","detail":"Breach B001: Contain the leak done"},{"ts":"2026-10-03T14:00:00.000Z","type":"breachstep","sid":"-","detail":"Breach B001: Inform the Data Protection Board done"},{"ts":"2026-10-04T05:30:00.000Z","type":"breachstep","sid":"-","detail":"Breach B001: Notify affected parents done"},{"ts":"2026-10-05T10:10:00.000Z","type":"breachstep","sid":"-","detail":"Breach B001: Send the detailed report to the Board done"},{"ts":"2026-10-07T06:30:00.000Z","type":"breachstep","sid":"-","detail":"Breach B001: Fix the cause done"},{"ts":"2026-10-09T04:30:00.000Z","type":"breachstep","sid":"-","detail":"Breach B001: Close the incident done"},{"ts":"2026-10-20T03:30:00.000Z","type":"notice","sid":"-","detail":"Privacy notice v2 published (EN, HI)"},{"ts":"2026-10-20T03:45:00.000Z","type":"drive","sid":"-","detail":"Consent drive started for 30 students"},{"ts":"2026-10-20T04:00:00.000Z","type":"sent","sid":"s001","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T04:08:00.000Z","type":"sent","sid":"s002","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T04:22:00.000Z","type":"sent","sid":"s003","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T04:43:00.000Z","type":"sent","sid":"s004","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T04:55:00.000Z","type":"sent","sid":"s005","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T05:14:00.000Z","type":"sent","sid":"s006","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T05:19:00.000Z","type":"sent","sid":"s007","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T05:27:00.000Z","type":"sent","sid":"s008","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T05:34:00.000Z","type":"sent","sid":"s009","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T05:47:00.000Z","type":"sent","sid":"s010","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T05:52:00.000Z","type":"sent","sid":"s011","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T06:15:00.000Z","type":"sent","sid":"s012","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T06:27:00.000Z","type":"sent","sid":"s013","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T06:34:00.000Z","type":"sent","sid":"s014","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T06:49:00.000Z","type":"sent","sid":"s015","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T06:58:00.000Z","type":"sent","sid":"s016","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T07:21:00.000Z","type":"sent","sid":"s017","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T07:29:00.000Z","type":"sent","sid":"s018","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T07:39:00.000Z","type":"sent","sid":"s019","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T07:58:00.000Z","type":"sent","sid":"s020","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T08:09:00.000Z","type":"sent","sid":"s021","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T08:31:00.000Z","type":"sent","sid":"s022","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T08:52:00.000Z","type":"sent","sid":"s023","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T09:00:00.000Z","type":"sent","sid":"s024","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T09:12:00.000Z","type":"sent","sid":"s025","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T09:29:00.000Z","type":"sent","sid":"s026","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T09:37:00.000Z","type":"sent","sid":"s027","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T09:42:00.000Z","type":"sent","sid":"s028","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T09:54:00.000Z","type":"sent","sid":"s029","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T10:10:00.000Z","type":"sent","sid":"s030","detail":"Consent link sent on WhatsApp"},{"ts":"2026-10-20T13:35:00.000Z","type":"consent","sid":"s002","detail":"Consent given, verified by OTP · records yes, web yes, newsletter yes"},{"ts":"2026-10-20T15:39:00.000Z","type":"consent","sid":"s004","detail":"Consent given, verified by OTP · records yes, web yes, newsletter yes"},{"ts":"2026-10-20T21:52:00.000Z","type":"consent","sid":"s006","detail":"Consent given, verified by OTP · records yes, web yes, newsletter no"},{"ts":"2026-10-21T00:31:00.000Z","type":"consent","sid":"s011","detail":"Consent given, verified by OTP · records yes, web yes, newsletter yes"},{"ts":"2026-10-21T05:35:00.000Z","type":"consent","sid":"s012","detail":"Consent given, verified by OTP · records yes, web yes, newsletter yes"},{"ts":"2026-10-21T06:07:00.000Z","type":"consent","sid":"s014","detail":"Consent given, verified by OTP · records yes, web yes, newsletter no"},{"ts":"2026-10-21T07:12:00.000Z","type":"consent","sid":"s015","detail":"Consent given, verified by OTP · records yes, web yes, newsletter yes"},{"ts":"2026-10-21T10:49:00.000Z","type":"consent","sid":"s017","detail":"Consent given, verified by OTP · records yes, web no, newsletter yes"},{"ts":"2026-10-21T16:01:00.000Z","type":"consent","sid":"s021","detail":"Consent given, verified by OTP · records yes, web yes, newsletter yes"},{"ts":"2026-10-21T18:02:00.000Z","type":"consent","sid":"s022","detail":"Consent given, verified by OTP · records yes, web no, newsletter no"},{"ts":"2026-10-21T18:40:00.000Z","type":"consent","sid":"s024","detail":"Consent given, verified by OTP · records yes, web yes, newsletter yes"},{"ts":"2026-10-21T20:08:00.000Z","type":"consent","sid":"s025","detail":"Consent given, verified by OTP · records yes, web no, newsletter no"},{"ts":"2026-10-21T23:53:00.000Z","type":"consent","sid":"s026","detail":"Consent given, verified by OTP · records yes, web yes, newsletter yes"},{"ts":"2026-10-22T02:21:00.000Z","type":"consent","sid":"s027","detail":"Consent given, verified by OTP · records yes, web yes, newsletter yes"},{"ts":"2026-10-22T07:00:00.000Z","type":"consent","sid":"s029","detail":"Consent given, verified by OTP · records yes, web yes, newsletter yes"},{"ts":"2026-10-22T10:41:00.000Z","type":"consent","sid":"s030","detail":"Consent given, verified by OTP · records yes, web yes, newsletter yes"},{"ts":"2026-10-22T14:41:00.000Z","type":"withdraw","sid":"s014","detail":"Optional consents withdrawn by parent"},{"ts":"2026-10-22T15:41:00.000Z","type":"remind","sid":"-","detail":"Reminder sent to pending parents"},{"ts":"2026-10-22T16:11:00.000Z","type":"request","sid":"s004","detail":"Parent request: access"},{"ts":"2026-10-22T16:56:00.000Z","type":"request","sid":"s009","detail":"Parent request: correct"},{"ts":"2026-10-22T17:16:00.000Z","type":"request","sid":"s021","detail":"Parent request: delete"}]}$seed$::jsonb);
select public._seed_demo();