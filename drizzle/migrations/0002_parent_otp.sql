create table public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  sid text not null references public.students(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  used_at timestamptz,
  void boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.otp_codes(sid, created_at desc);
grant all on public.otp_codes to service_role;
alter table public.otp_codes enable row level security;

-- Hash helper: the code is never stored, only sha256(sid:code).
create or replace function public.otp_hash(_sid text, _code text) returns text language sql immutable set search_path = public as $$
  select encode(sha256(convert_to(_sid || ':' || _code, 'UTF8')), 'hex') $$;
revoke all on function public.otp_hash(text, text) from public, anon, authenticated;

-- Called only by the server (service role). Enforces 3 sends per student per hour; voids older codes.
create or replace function public.otp_issue(_sid text, _hash text, _ttl_seconds integer default 600) returns jsonb
language plpgsql security definer set search_path = public as $$
declare demo boolean; phone text;
begin
  select sc.is_demo, s.phone into demo, phone from public.students s join public.schools sc on sc.id = s.school_id where s.id = _sid;
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  if (select count(*) from public.otp_codes where sid = _sid and created_at > now() - interval '1 hour') >= 3 then
    return jsonb_build_object('ok', false, 'error', 'rate');
  end if;
  update public.otp_codes set void = true where sid = _sid and used_at is null and not void;
  insert into public.otp_codes(sid, code_hash, expires_at) values (_sid, _hash, now() + make_interval(secs => _ttl_seconds));
  return jsonb_build_object('ok', true, 'demo', demo, 'phone', phone);
end $$;
revoke all on function public.otp_issue(text, text, integer) from public, anon, authenticated;
grant execute on function public.otp_issue(text, text, integer) to service_role;

drop function public.give_consent(text, boolean, boolean);
create or replace function public.give_consent(_sid text, _web boolean, _newsletter boolean, _code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.students; was boolean; ch text; o public.otp_codes; r public.ledger;
begin
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
  was := s.status <> 'pending';
  update public.students set
    choices = jsonb_build_object('records', true, 'web', _web, 'newsletter', _newsletter),
    status = case when was and not _web and not _newsletter then 'withdrawn' else 'given' end,
    consent_at = now(),
    receipt = coalesce(receipt, 'SAH-' || substr(id, 2) || '-' || right(floor(extract(epoch from now()) * 1000)::bigint::text, 4))
  where id = _sid;
  ch := 'records yes, web ' || case when _web then 'yes' else 'no' end || ', newsletter ' || case when _newsletter then 'yes' else 'no' end;
  r := public._append(s.school_id, case when was then 'update' else 'consent' end, _sid,
    case when was then 'Consent updated' else 'Consent given' end || ', verified by OTP · ' || ch);
  return jsonb_build_object('ok', true, 'event', to_jsonb(r) - 'school_id');
end $$;