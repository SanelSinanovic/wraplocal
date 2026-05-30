-- ============================================================
-- WrapBridge - Edge Function rate limiting
-- Run this in Supabase SQL Editor before deploying the updated functions.
-- Purpose: provide an atomic, service-role-only limiter for sensitive
-- Supabase Edge Functions.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  key_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1 CHECK (request_count > 0),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (key_hash, window_start)
);

CREATE INDEX IF NOT EXISTS idx_edge_rate_limits_expires_at
  ON public.edge_rate_limits (expires_at);

ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.edge_rate_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_edge_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS TABLE (
  allowed boolean,
  current_count integer,
  limit_count integer,
  reset_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_reset_at timestamptz;
  v_count integer;
BEGIN
  IF p_key_hash IS NULL OR length(trim(p_key_hash)) < 16 THEN
    RAISE EXCEPTION 'Invalid rate limit key';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 10000 THEN
    RAISE EXCEPTION 'Invalid rate limit value';
  END IF;

  IF p_window_seconds IS NULL OR p_window_seconds < 1 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'Invalid rate limit window';
  END IF;

  v_window_start := to_timestamp(
    floor(extract(epoch FROM v_now) / p_window_seconds) * p_window_seconds
  );
  v_reset_at := v_window_start + make_interval(secs => p_window_seconds);

  DELETE FROM public.edge_rate_limits
  WHERE expires_at < v_now;

  INSERT INTO public.edge_rate_limits (key_hash, window_start, request_count, expires_at)
  VALUES (p_key_hash, v_window_start, 1, v_reset_at + interval '5 minutes')
  ON CONFLICT (key_hash, window_start)
  DO UPDATE SET
    request_count = public.edge_rate_limits.request_count + 1,
    expires_at = EXCLUDED.expires_at
  RETURNING request_count INTO v_count;

  RETURN QUERY SELECT
    v_count <= p_limit,
    v_count,
    p_limit,
    v_reset_at;
END;
$$;

REVOKE ALL ON FUNCTION public.check_edge_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_edge_rate_limit(text, integer, integer) TO service_role;
