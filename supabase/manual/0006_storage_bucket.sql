-- Private bucket for scanned paper consent forms (policies are in migration 0004).
insert into storage.buckets (id, name, public, file_size_limit)
values ('paper-consents', 'paper-consents', false, 10485760)
on conflict (id) do nothing;
