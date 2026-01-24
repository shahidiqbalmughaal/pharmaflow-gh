-- Create access_logs table to track user access events
CREATE TABLE public.access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shop_id UUID,
  action_type TEXT NOT NULL, -- 'login', 'view', 'export', 'bulk_query', 'sensitive_access'
  resource_type TEXT NOT NULL, -- 'customers', 'suppliers', 'salesmen', 'medicines', 'sales', 'expenses'
  resource_count INTEGER DEFAULT 1,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Shop owners and managers can view access logs for their shop
CREATE POLICY "Shop owners and managers can view access logs"
ON public.access_logs
FOR SELECT
USING (
  is_super_admin(auth.uid()) OR
  (shop_id = get_user_shop_id(auth.uid()) AND 
   get_shop_role(auth.uid(), shop_id) IN ('owner', 'manager'))
);

-- Any authenticated user can insert access logs (for their own actions)
CREATE POLICY "Users can insert their own access logs"
ON public.access_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for fast queries
CREATE INDEX idx_access_logs_shop_created ON public.access_logs(shop_id, created_at DESC);
CREATE INDEX idx_access_logs_user_created ON public.access_logs(user_id, created_at DESC);
CREATE INDEX idx_access_logs_action_type ON public.access_logs(action_type);

-- Create a function to detect anomalies (bulk access patterns)
CREATE OR REPLACE FUNCTION public.get_access_anomalies(p_shop_id UUID, p_hours INTEGER DEFAULT 24)
RETURNS TABLE(
  user_id UUID,
  action_type TEXT,
  resource_type TEXT,
  total_count BIGINT,
  unique_sessions INTEGER,
  avg_count_per_session NUMERIC,
  is_anomaly BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.user_id,
    al.action_type,
    al.resource_type,
    COUNT(*) as total_count,
    COUNT(DISTINCT DATE_TRUNC('hour', al.created_at)) as unique_sessions,
    ROUND(COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT DATE_TRUNC('hour', al.created_at)), 0), 2) as avg_count_per_session,
    -- Flag as anomaly if: bulk_query action OR >50 accesses in period OR >20 avg per session
    (al.action_type = 'bulk_query' OR COUNT(*) > 50 OR 
     ROUND(COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT DATE_TRUNC('hour', al.created_at)), 0), 2) > 20) as is_anomaly
  FROM public.access_logs al
  WHERE al.shop_id = p_shop_id
    AND al.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
  GROUP BY al.user_id, al.action_type, al.resource_type
  ORDER BY total_count DESC;
END;
$$;