-- IMPORTANT: run this file by itself before 20261026000100_add_deferred_order_management.sql.
-- PostgreSQL requires a newly added enum value to be committed before another statement uses it.
alter type public.order_status add value if not exists 'deferred';
