-- payouts.sql part 7 of 7. Run parts in order. Safe to re-run.

-- Old withdrawals stored the destination as text like "MTN MoMo (+233241234567)".
insert into public.payout_requests (
  reference, user_id, amount, fee, net_amount, network, account_number, account_name,
  status, wallet_tx_id, admin_note, created_at
)
select
  'wdr-legacy-' || replace(t.id::text, '-', ''),
  t.user_id, -t.amount, 0, -t.amount,
  case
    when t.meta->>'details' ilike 'MTN%' then 'MTN'
    when t.meta->>'details' ilike 'Telecel%' or t.meta->>'details' ilike 'Vodafone%' then 'VOD'
    when t.meta->>'details' ilike 'AirtelTigo%' or t.meta->>'details' ilike 'AT %' then 'ATL'
  end,
  '0' || substr(public.normalize_gh_phone(substring(t.meta->>'details' from '\(([^)]*)\)')), 5),
  coalesce(u.full_name, ''),
  'pending', t.id,
  'Requested before automatic payouts (' || coalesce(t.meta->>'details', 'no details') || ')',
  t.created_at
from public.wallet_transactions t
join public.users u on u.id = t.user_id
where t.type = 'withdrawal' and t.amount < 0
  and not exists (select 1 from public.payout_requests pr where pr.wallet_tx_id = t.id)
on conflict do nothing;

notify pgrst, 'reload schema';
