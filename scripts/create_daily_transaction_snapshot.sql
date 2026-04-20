-- Create a separate table for daily payment totals.
-- This is a snapshot table (materialized by function), not a view.
-- Use this in Supabase SQL editor or as a migration script.
--
-- Optional first step: inspect existing public tables in your Supabase database.
-- Run this query in the SQL editor before creating the snapshot table:
-- select tablename from pg_catalog.pg_tables where schemaname = 'public' order by tablename;

create table if not exists public.daily_transaction_snapshot (
  day date primary key,
  total_cash numeric(18,2) not null default 0,
  total_card_upi numeric(18,2) not null default 0,
  total_amount numeric(18,2) not null default 0,
  last_refreshed_at timestamptz not null default now()
);

-- Refresh function:
-- 1) upsert daily totals for the last 3 months
-- 2) delete any rows older than 3 months from the snapshot table
create or replace function public.refresh_daily_transaction_snapshot()
returns void language plpgsql as $$
begin
  insert into public.daily_transaction_snapshot (day, total_cash, total_card_upi, total_amount, last_refreshed_at)
  select
    date(("closedAt" at time zone 'UTC') at time zone 'Asia/Kolkata') as day,
    sum(
      case
        when "paymentMode" = 'CASH' then coalesce("totalAmount", 0)
        when "paymentMode" = 'SPLIT' then coalesce("splitCashAmount", 0)
        else 0
      end
    ) as total_cash,
    sum(
      case
        when "paymentMode" in ('ONLINE', 'UPI', 'CARD') then coalesce("totalAmount", 0)
        when "paymentMode" = 'SPLIT' then coalesce("splitOnlineAmount", 0)
        else 0
      end
    ) as total_card_upi,
    sum(
      case
        when "paymentMode" = 'CASH' then coalesce("totalAmount", 0)
        when "paymentMode" in ('ONLINE', 'UPI', 'CARD') then coalesce("totalAmount", 0)
        when "paymentMode" = 'SPLIT' then coalesce("splitCashAmount", 0) + coalesce("splitOnlineAmount", 0)
        else 0
      end
    ) as total_amount,
    now() as last_refreshed_at
  from public."Tab"
  where status in ('CLOSED', 'PAID_HOLD')
    and "closedAt" >= now() - interval '3 months'
  group by day
  on conflict (day) do update
    set total_cash = excluded.total_cash,
        total_card_upi = excluded.total_card_upi,
        total_amount = excluded.total_amount,
        last_refreshed_at = excluded.last_refreshed_at;

  delete from public.daily_transaction_snapshot
  where day < date_trunc('day', now() at time zone 'Asia/Kolkata') - interval '3 months';
end;
$$;

-- Initial load / manual refresh
select public.refresh_daily_transaction_snapshot();

-- Optional: schedule daily refresh using pg_cron.
-- Supabase runs pg_cron jobs in UTC, so this example schedules refresh at 4:10 AM IST
-- every day, which is 22:40 UTC on the previous day.
-- Enable pg_cron if not already installed in your database:
-- create extension if not exists pg_cron;

-- Create a daily job that refreshes the snapshot every night.
-- Replace 'daily_transaction_snapshot_refresh' if you want a different job name.
create or replace function public.schedule_refresh_daily_transaction_snapshot()
returns void language sql as $$
  select cron.schedule('daily_transaction_snapshot_refresh', '40 22 * * *', $$select public.refresh_daily_transaction_snapshot();$$);
$$;

-- Run once to create the job
select public.schedule_refresh_daily_transaction_snapshot();
