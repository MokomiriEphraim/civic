create table if not exists public.civic_json_documents (
  key text primary key,
  revision bigint not null default 1 check (revision > 0),
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.civic_json_documents enable row level security;
revoke all on table public.civic_json_documents from anon, authenticated;
grant all on table public.civic_json_documents to service_role;

create or replace function public.civic_compare_and_set_json_document(
  p_key text,
  p_expected_revision bigint,
  p_value jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_rows integer;
begin
  if p_expected_revision is null then
    insert into public.civic_json_documents (key, revision, value)
    values (p_key, 1, p_value)
    on conflict (key) do nothing;
    get diagnostics affected_rows = row_count;
    return affected_rows = 1;
  end if;

  update public.civic_json_documents
  set value = p_value,
      revision = revision + 1,
      updated_at = now()
  where key = p_key
    and revision = p_expected_revision;

  return found;
end;
$$;

revoke all on function public.civic_compare_and_set_json_document(text, bigint, jsonb)
  from public, anon, authenticated;
grant execute on function public.civic_compare_and_set_json_document(text, bigint, jsonb)
  to service_role;
