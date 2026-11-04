-- Run by hand in the Supabase SQL editor after the drizzle migrations.
-- Lets a static build (GitHub Pages, no server) request a parent OTP straight from the browser.
-- The code is generated inside Postgres and returned ONLY for demo schools, where the UI shows it
-- on screen anyway. Real schools get 'sms' back: they still need a server/edge function that sends SMS.
create or replace function public.otp_request(_sid text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare demo boolean; code text; r jsonb;
begin
  select sc.is_demo into demo from public.students s join public.schools sc on sc.id = s.school_id where s.id = _sid;
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  if not demo then return jsonb_build_object('ok', false, 'error', 'sms'); end if;
  code := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
  r := public.otp_issue(_sid, public.otp_hash(_sid, code), 600);
  if not (r->>'ok')::boolean then return jsonb_build_object('ok', false, 'error', coalesce(r->>'error', 'invalid')); end if;
  return jsonb_build_object('ok', true, 'code', code);
end $$;
revoke all on function public.otp_request(text) from public;
grant execute on function public.otp_request(text) to anon, authenticated;
