alter table public.students drop constraint students_lang_check;
alter table public.students add constraint students_lang_check check (lang in ('en','hi','mr','ta','bn','gu','kn','te'));
alter table public.students add column paper boolean not null default false, add column paper_file text, add column paper_hash text;
alter table public.ledger drop constraint ledger_type_check;
alter table public.ledger add constraint ledger_type_check check (type in ('notice','drive','sent','remind','consent','update','withdraw','request','resolved','plan','import','breach','breachstep','vendor','team','pack','settings','group'));

create table public.groups (
  id uuid primary key default gen_random_uuid(), name text not null,
  join_code text not null unique default substr(md5(gen_random_uuid()::text), 1, 8),
  is_demo boolean not null default false, created_at timestamptz not null default now()
);
create table public.group_admins (
  group_id uuid not null references public.groups(id) on delete cascade, user_id uuid not null,
  created_at timestamptz not null default now(), primary key (group_id, user_id)
);
create table public.notices (
  school_id uuid not null references public.schools(id) on delete cascade, version text not null,
  content jsonb not null, published_at timestamptz not null default now(), published_by text not null default '',
  primary key (school_id, version)
);
alter table public.schools
  add column languages text[] not null default '{en,hi}',
  add column group_id uuid references public.groups(id) on delete set null,
  add column digest_email boolean not null default false,
  add column digest_email_to text not null default '';

grant select on public.groups, public.notices to anon, authenticated;
grant select on public.group_admins to authenticated;
grant all on public.groups, public.group_admins, public.notices to service_role;
alter table public.groups enable row level security;
alter table public.group_admins enable row level security;
alter table public.notices enable row level security;

create or replace function public.can_group(_group uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.groups where id = _group and is_demo)
      or exists (select 1 from public.group_admins where group_id = _group and user_id = auth.uid()) $$;

-- Group admins act as Principal on every school in their group
create or replace function public.my_role(_school uuid) returns text
language sql stable security definer set search_path = public as $$
  select case when exists (select 1 from public.schools where id = _school and is_demo) then 'principal'
    else coalesce(
      (select role from public.school_staff where school_id = _school and user_id = auth.uid()),
      (select 'principal' from public.schools s join public.group_admins ga on ga.group_id = s.group_id where s.id = _school and ga.user_id = auth.uid() limit 1)) end
$$;

create policy "group admins and demo" on public.groups for select to anon, authenticated using (public.can_group(id));
create policy "see own group admin rows" on public.group_admins for select to authenticated using (user_id = auth.uid());
create policy "read by staff" on public.notices for select to anon, authenticated using (public.can_access(school_id));

create or replace function public.guard_school_update() returns trigger language plpgsql set search_path = public as $$
begin
  new.id := old.id; new.slug := old.slug; new.is_demo := old.is_demo; new.created_at := old.created_at;
  if coalesce(current_setting('sahmati.group_change', true), '') <> 'on' then new.group_id := old.group_id; end if;
  if coalesce(current_setting('sahmati.settings_change', true), '') <> 'on' then
    new.languages := old.languages; new.digest_email := old.digest_email; new.digest_email_to := old.digest_email_to;
  end if;
  return new;
end $$;

-- Paper-form scans: private bucket, path <school_id>/<file>, staff (not teachers) only
create or replace function public.paper_access(_name text, _write boolean) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare f text := split_part(coalesce(_name, ''), '/', 1); s uuid; ext text := lower(regexp_replace(coalesce(_name, ''), '^.*[.]', ''));
begin
  if f !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
  s := f::uuid;
  if _write then return public.can_write(s) and ext in ('jpg','jpeg','png','webp','heic','pdf'); end if;
  return coalesce(public.my_role(s) in ('principal','office','auditor'), false);
end $$;
create policy "school staff read paper scans" on storage.objects for select to anon, authenticated using (bucket_id = 'paper-consents' and public.paper_access(name, false));
create policy "school office uploads paper scans" on storage.objects for insert to anon, authenticated with check (bucket_id = 'paper-consents' and public.paper_access(name, true));

create or replace function public.record_paper_consent(_school uuid, _sid text, _web boolean, _newsletter boolean, _witness text, _date date, _file text, _hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.students; nv text; r public.ledger; ch text;
begin
  if not public.can_write(_school) then raise exception 'Your role can''t record consent.'; end if;
  select * into s from public.students where id = _sid and school_id = _school for update;
  if not found then raise exception 'Student not found'; end if;
  if s.status not in ('pending','renewal') then raise exception 'Consent is already recorded for this student.'; end if;
  if coalesce(trim(_witness), '') = '' then raise exception 'Name the staff member who witnessed the form.'; end if;
  if _date is null or _date > (now() at time zone 'Asia/Kolkata')::date then raise exception 'Choose the date the form was signed.'; end if;
  if coalesce(_hash, '') !~ '^[0-9a-f]{64}$' then raise exception 'Upload the scan of the signed form.'; end if;
  if coalesce(_file, '') not like _school::text || '/%' then raise exception 'Upload the scan of the signed form.'; end if;
  select notice_version into nv from public.schools where id = _school;
  update public.students set status = 'given', choices = jsonb_build_object('records', true, 'web', _web, 'newsletter', _newsletter),
    consent_at = case when _date = (now() at time zone 'Asia/Kolkata')::date then now() else (_date::timestamp + interval '12 hours') at time zone 'Asia/Kolkata' end,
    consent_notice = nv, paper = true, paper_file = _file, paper_hash = _hash,
    receipt = coalesce(receipt, 'SAH-' || substr(id, 2) || '-' || right(floor(extract(epoch from now()) * 1000)::bigint::text, 4))
  where id = _sid;
  ch := 'records yes, web ' || case when _web then 'yes' else 'no' end || ', newsletter ' || case when _newsletter then 'yes' else 'no' end;
  r := public._append(_school, 'consent', _sid, 'Assisted consent recorded from paper form, witnessed by ' || left(trim(_witness), 80) || ' (signed ' || to_char(_date, 'DD Mon YYYY') || ') · ' || ch || ' · sha256 ' || _hash);
  return to_jsonb(r) - 'school_id';
end $$;

create or replace function public.publish_notice(_school uuid, _content jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare v text; langs text;
begin
  if not public.can_admin(_school) then raise exception 'Only the Principal can publish the notice.'; end if;
  if jsonb_typeof(_content) <> 'object' or not (_content ? 'en') then raise exception 'The notice needs an English version.'; end if;
  if length(_content::text) > 200000 then raise exception 'The notice is too long.'; end if;
  select 'v' || (coalesce(nullif(regexp_replace(notice_version, '\D', '', 'g'), ''), '0')::int + 1) into v from public.schools where id = _school;
  perform set_config('sahmati.settings_change', 'on', true);
  update public.schools set notice_version = v where id = _school;
  insert into public.notices(school_id, version, content, published_by) values (_school, v, _content, (public._who(_school))[1])
  on conflict (school_id, version) do update set content = excluded.content, published_at = now();
  select string_agg(upper(k), ', ') into langs from jsonb_object_keys(_content) k;
  perform public._append(_school, 'notice', '-', 'Privacy notice ' || v || ' published (' || langs || ')');
  return v;
end $$;

create or replace function public.set_languages(_school uuid, _langs text[]) returns void
language plpgsql security definer set search_path = public as $$
declare l text[];
begin
  if not public.can_admin(_school) then raise exception 'Only the Principal can change school settings.'; end if;
  select array_agg(x order by array_position(array['en','hi','mr','ta','bn','gu','kn','te'], x)) into l from (select distinct x from unnest(_langs) x where x in ('en','hi','mr','ta','bn','gu','kn','te')) y;
  if l is null or not ('en' = any(l)) then raise exception 'Keep English switched on.'; end if;
  perform set_config('sahmati.settings_change', 'on', true);
  update public.schools set languages = l where id = _school;
  perform public._append(_school, 'settings', '-', 'Parent languages set: ' || upper(array_to_string(l, ', ')));
end $$;

create or replace function public.set_digest(_school uuid, _on boolean, _to text) returns void
language plpgsql security definer set search_path = public as $$
declare em text := lower(trim(coalesce(_to, '')));
begin
  if not public.can_admin(_school) then raise exception 'Only the Principal can change school settings.'; end if;
  if _on and em !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'Enter a valid email address'; end if;
  perform set_config('sahmati.settings_change', 'on', true);
  update public.schools set digest_email = _on, digest_email_to = em where id = _school;
  perform public._append(_school, 'settings', '-', case when _on then 'Weekly summary email switched on' else 'Weekly summary email switched off' end);
end $$;

create or replace function public.create_group(_school uuid, _name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  if auth.uid() is null or not public.can_admin(_school) or exists (select 1 from public.schools where id = _school and is_demo) then raise exception 'Only the Principal can do this.'; end if;
  if (select group_id from public.schools where id = _school) is not null then raise exception 'This school is already in a group.'; end if;
  if coalesce(trim(_name), '') = '' then raise exception 'Name the group'; end if;
  insert into public.groups(name) values (left(trim(_name), 120)) returning id into g;
  insert into public.group_admins(group_id, user_id) values (g, auth.uid());
  perform set_config('sahmati.group_change', 'on', true);
  update public.schools set group_id = g where id = _school;
  perform public._append(_school, 'group', '-', 'School group created: ' || trim(_name));
  return g;
end $$;

create or replace function public.join_group(_school uuid, _code text) returns void
language plpgsql security definer set search_path = public as $$
declare g public.groups;
begin
  if auth.uid() is null or not public.can_admin(_school) or exists (select 1 from public.schools where id = _school and is_demo) then raise exception 'Only the Principal can do this.'; end if;
  select * into g from public.groups where join_code = lower(trim(_code)) and not is_demo;
  if not found then raise exception 'That group code isn''t valid.'; end if;
  perform set_config('sahmati.group_change', 'on', true);
  update public.schools set group_id = g.id where id = _school;
  perform public._append(_school, 'group', '-', 'Joined school group: ' || g.name);
end $$;

create or replace function public.group_overview(_group uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_group(_group) then raise exception 'Not allowed'; end if;
  return jsonb_build_object(
    'name', (select name from public.groups where id = _group),
    'joinCode', (select case when is_demo then null else join_code end from public.groups where id = _group),
    'schools', (select coalesce(jsonb_agg(x order by x->>'name'), '[]') from (
      select jsonb_build_object('id', sc.id, 'name', sc.name, 'slug', sc.slug, 'city', sc.city,
        'students', (select count(*) from public.students where school_id = sc.id),
        'recorded', (select count(*) from public.students where school_id = sc.id and status <> 'pending'),
        'pending', (select count(*) from public.students where school_id = sc.id and status in ('pending','renewal')),
        'openRequests', (select count(*) from public.requests where school_id = sc.id and status = 'open'),
        'overdue', (select count(*) from public.requests where school_id = sc.id and status = 'open' and created_at < now() - interval '7 days'),
        'openBreaches', (select count(*) from public.breaches where school_id = sc.id and status = 'open'),
        'met', (select count(*) from jsonb_array_elements(public.public_school(sc.slug)->'checks') c where (c->>'ok')::boolean),
        'steps', jsonb_array_length(public.public_school(sc.slug)->'checks'),
        'lastActivity', (select max(ts) from public.ledger where school_id = sc.id)) x
      from public.schools sc where sc.group_id = _group) y));
end $$;

create or replace function public.parent_view(_sid text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'school', jsonb_build_object('name', sc.name, 'city', sc.city, 'slug', sc.slug, 'noticeVersion', sc.notice_version, 'languages', sc.languages, 'dpo', sc.dpo),
    'notice', (select n.content from public.notices n where n.school_id = sc.id and n.version = sc.notice_version),
    'student', jsonb_build_object('id', s.id, 'name', s.name, 'cls', s.cls, 'sec', s.sec, 'parent', s.parent,
       'phone', left(s.phone, 2) || 'XXXX' || right(s.phone, 4), 'lang', s.lang, 'status', s.status, 'choices', s.choices,
       'consentAt', s.consent_at, 'receipt', s.receipt, 'paper', s.paper),
    'event', (select to_jsonb(l) - 'school_id' from public.ledger l where l.school_id = s.school_id and l.sid = s.id and l.type in ('consent','update','withdraw') order by seq desc limit 1))
  from public.students s join public.schools sc on sc.id = s.school_id where s.id = _sid
$$;

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
    if demo and exists (select 1 from public.students where id = new_id) then new_id := 's' || substr(md5(gen_random_uuid()::text), 1, 12); end if;
    insert into public.students(id, school_id, name, cls, sec, parent, phone, lang)
    values (new_id, _school, r->>'name', r->>'cls', coalesce(nullif(r->>'sec', ''), 'A'), r->>'parent', r->>'phone',
      case when lower(r->>'lang') in ('hi','mr','ta','bn','gu','kn','te') then lower(r->>'lang') else 'en' end);
  end loop;
  perform public._append(_school, 'import', '-', n || ' students imported from spreadsheet');
  return n;
end $$;

-- Extra sample schools in the demo trust
create or replace function public._seed_demo_school(_g uuid, _slug text, _name text, _city text, _prefix text, _n int, _given int, _open_req int, _overdue int, _breach boolean, _plan boolean) returns void
language plpgsql security definer set search_path = public as $$
declare sc uuid; k int; first text[] := array['Aditi','Rohan','Sneha','Karan','Meher','Arnav','Tanvi','Kunal','Ritika','Varun','Isha','Nikhil','Pooja','Aman','Simran','Yuvraj','Nandini','Harsh','Avni','Dev','Kavya','Rahul','Trisha','Om'];
  last text[] := array['Bhatia','Malhotra','Kapoor','Sethi','Arora','Khanna','Chopra','Grover','Bajaj','Tandon','Ahuja','Mehra'];
  par text[] := array['Ritu','Anil','Seema','Vikram','Shalini','Rakesh','Monika','Sunil','Geeta','Ashok','Nisha','Pradeep'];
  cls text[] := array['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'];
  langs text[] := array['en','hi','en','mr','en','ta','hi','bn','en','gu','kn','te'];
  sid text; ln text;
begin
  select id into sc from public.schools where slug = _slug;
  if sc is null then
    insert into public.schools(name, city, slug, notice_version, breach_plan, dpo, is_demo, languages)
    values (_name, _city, _slug, 'v2', _plan, 'Mr. S. Malhotra, Administrator', true, '{en,hi,mr,ta,bn,gu,kn,te}') returning id into sc;
  else
    perform set_config('sahmati.demo_reset', 'on', true);
    delete from public.ledger where school_id = sc; delete from public.students where school_id = sc;
    delete from public.requests where school_id = sc; delete from public.breaches where school_id = sc;
    delete from public.vendors where school_id = sc; delete from public.access_log where school_id = sc;
    perform set_config('sahmati.demo_reset', 'off', true);
    update public.schools set breach_plan = _plan, notice_version = 'v2' where id = sc;
  end if;
  update public.schools set group_id = _g where id = sc;
  perform public._append(sc, 'notice', '-', 'Privacy notice v2 published (EN, HI)', to_char((now() - interval '20 days') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
  perform public._append(sc, 'drive', '-', 'Consent drive started for ' || _n || ' students', to_char((now() - interval '19 days') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
  for k in 1.._n loop
    sid := _prefix || lpad(k::text, 3, '0'); ln := last[1 + (k * 5) % array_length(last, 1)];
    insert into public.students(id, school_id, name, cls, sec, parent, phone, lang, status, choices, sent_at, consent_at, receipt, consent_notice, created_at)
    values (sid, sc, first[1 + (k - 1) % 24] || ' ' || ln, cls[1 + (k - 1) % 15], case when k % 2 = 0 then 'B' else 'A' end,
      par[1 + (k * 7) % 12] || ' ' || ln, '91' || lpad((20000000 + k * 4111 + length(_slug) * 13)::text, 8, '0'), langs[1 + k % 12],
      case when k <= _given then 'given' else 'pending' end,
      jsonb_build_object('records', true, 'web', k % 3 = 0, 'newsletter', k % 2 = 0),
      now() - interval '18 days', case when k <= _given then now() - make_interval(days => 17 - (k % 15)) end,
      case when k <= _given then 'SAH-' || upper(_prefix) || lpad(k::text, 3, '0') end, case when k <= _given then 'v2' end, now() - interval '30 days');
    perform public._append(sc, 'sent', sid, 'Consent link sent on WhatsApp', to_char((now() - interval '18 days') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
  end loop;
  for k in 1.._given loop
    sid := _prefix || lpad(k::text, 3, '0');
    perform public._append(sc, 'consent', sid, 'Consent given, verified by OTP · records yes, web ' || case when k % 3 = 0 then 'yes' else 'no' end || ', newsletter ' || case when k % 2 = 0 then 'yes' else 'no' end,
      to_char((now() - make_interval(days => 17 - (k % 15))) at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
  end loop;
  for k in 1.._open_req loop
    insert into public.requests(school_id, id, sid, type, note, created_at, status)
    values (sc, _prefix || 'r' || k, _prefix || lpad((k + 2)::text, 3, '0'), (array['access','correct','delete'])[1 + k % 3], 'Please share what the school holds.',
      case when k <= _overdue then now() - interval '10 days' else now() - interval '2 days' end, 'open');
  end loop;
  insert into public.vendors(school_id, id, name, role, data, dpa, signed_at, review)
  values (sc, _prefix || 'v1', 'SchoolERP Cloud', 'ERP', '["All records"]', 'signed', now() - interval '60 days', now() + interval '300 days'),
         (sc, _prefix || 'v2', 'SafeRide', 'Bus tracking app', '["Names","Phones","Addresses"]', case when _plan then 'signed' else 'sent' end, case when _plan then now() - interval '40 days' end, null);
  if _breach then
    insert into public.breaches(school_id, id, what, discovered_at, data, count, cause, created_at, steps, status)
    values (sc, _prefix || 'b1', 'Class WhatsApp group list forwarded to an outside number', now() - interval '30 hours', '["Names and classes","Contact numbers"]', 24, 'Sent to the wrong person', now() - interval '29 hours',
      jsonb_build_array(to_jsonb(now() - interval '28 hours'), null, null, null, null, null), 'open');
    perform public._append(sc, 'breach', '-', 'Data breach logged · Sent to the wrong person · about 24 students');
  end if;
end $$;
revoke all on function public._seed_demo_school(uuid, text, text, text, text, int, int, int, int, boolean, boolean) from public, anon, authenticated;

create or replace function public._seed_demo() returns void
language plpgsql security definer set search_path = public as $$
declare d jsonb; sc uuid; e jsonb; g uuid;
begin
  perform set_config('sahmati.seeding', 'on', true);
  perform set_config('sahmati.group_change', 'on', true);
  perform set_config('sahmati.settings_change', 'on', true);
  select data into d from public.demo_seed where id = 1;
  select id into g from public.groups where is_demo limit 1;
  if g is null then insert into public.groups(name, is_demo) values ('Green Valley Education Trust', true) returning id into g; end if;
  select id into sc from public.schools where slug = d#>>'{school,slug}';
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
    delete from public.notices where school_id = sc;
    perform set_config('sahmati.demo_reset', 'off', true);
    update public.schools set name = d#>>'{school,name}', city = d#>>'{school,city}', notice_version = d#>>'{school,noticeVersion}', breach_plan = false, dpo = d#>>'{school,dpo}' where id = sc;
  end if;
  update public.schools set group_id = g, languages = '{en,hi,mr,ta,bn,gu,kn,te}', digest_email = false, digest_email_to = '' where id = sc;
  insert into public.students(id, school_id, name, cls, sec, parent, phone, lang, status, choices, sent_at, consent_at, receipt, consent_notice, created_at)
  select x->>'id', sc, x->>'name', x->>'cls', x->>'sec', x->>'parent', x->>'phone',
    case x->>'id' when 's005' then 'mr' when 's008' then 'ta' when 's019' then 'bn' when 's023' then 'gu' when 's028' then 'te' else x->>'lang' end,
    x->>'status', x->'choices', (x->>'sentAt')::timestamptz, (x->>'consentAt')::timestamptz, x->>'receipt',
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
  insert into public.notices(school_id, version, content, published_by, published_at) values (sc, d#>>'{school,noticeVersion}', jsonb_build_object(
    'en', jsonb_build_object('collect', 'Your child''s name, class, photo, address, your contact details, marks, attendance and any medical notes you share with us.', 'why', 'To teach your child, prepare report cards, run school transport, and reach you in an emergency.', 'share', 'Our school software (SchoolERP Cloud), bus tracking (SafeRide), the annual photographer (Kapoor Studio) and email (Google Workspace). Each only gets what it needs.', 'keep', 'While your child studies here, and for 3 years after they leave, then we delete it.', 'rights', 'You can ask to see, correct or delete your child''s data. We reply within 7 days.', 'contact', 'Mrs. R. Kapoor, Vice Principal, at the school office.', 'withdraw', 'Use the same consent link at any time. Withdrawing is free and as easy as giving consent.'),
    'hi', jsonb_build_object('collect', 'आपके बच्चे का नाम, कक्षा, फ़ोटो, पता, आपका संपर्क, अंक, उपस्थिति और स्वास्थ्य संबंधी जानकारी जो आप हमें देते हैं।', 'why', 'पढ़ाई, रिपोर्ट कार्ड, स्कूल बस, और आपात स्थिति में आपसे संपर्क के लिए।', 'share', 'हमारा स्कूल सॉफ़्टवेयर (SchoolERP Cloud), बस ट्रैकिंग (SafeRide), वार्षिक फ़ोटोग्राफ़र (Kapoor Studio) और ईमेल (Google Workspace)। हर एक को केवल ज़रूरी जानकारी मिलती है।', 'keep', 'जब तक आपका बच्चा यहाँ पढ़ता है, और स्कूल छोड़ने के 3 साल बाद तक। फिर हम इसे हटा देते हैं।', 'rights', 'आप अपने बच्चे का डेटा देखने, सुधारने या हटाने के लिए कह सकते हैं। हम 7 दिनों में जवाब देते हैं।', 'contact', 'श्रीमती आर. कपूर, उप-प्रधानाचार्य, स्कूल कार्यालय।', 'withdraw', 'इसी सहमति लिंक से कभी भी। सहमति वापस लेना मुफ़्त है और देने जितना ही आसान है।')),
    'Mrs. R. Kapoor', '2026-10-20T09:00:00+05:30');
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
  perform public._seed_demo_school(g, 'gvjunior', 'Green Valley Junior School', 'Noida', 'j', 18, 15, 1, 0, false, true);
  perform public._seed_demo_school(g, 'gvinternational', 'Green Valley International', 'Gurugram', 'i', 24, 12, 3, 1, true, false);
  perform set_config('sahmati.seeding', 'off', true);
end $$;
revoke all on function public._seed_demo() from public, anon, authenticated;

select public._seed_demo();

alter publication supabase_realtime add table public.notices;