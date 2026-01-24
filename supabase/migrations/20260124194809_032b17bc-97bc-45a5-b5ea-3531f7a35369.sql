-- Drop existing function to change return type
DROP FUNCTION IF EXISTS public.get_access_anomalies(UUID, INTEGER);

-- Enhanced anomaly detection with customer-specific thresholds
CREATE OR REPLACE FUNCTION public.get_access_anomalies(p_shop_id UUID, p_hours INTEGER DEFAULT 24)
RETURNS TABLE(
  user_id UUID,
  action_type TEXT,
  resource_type TEXT,
  total_count BIGINT,
  unique_sessions INTEGER,
  avg_count_per_session NUMERIC,
  is_anomaly BOOLEAN,
  anomaly_reason TEXT
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
    COUNT(DISTINCT DATE_TRUNC('hour', al.created_at))::INTEGER as unique_sessions,
    ROUND(COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT DATE_TRUNC('hour', al.created_at)), 0), 2) as avg_count_per_session,
    -- Flag as anomaly with different thresholds based on resource type
    CASE 
      -- Customer data has stricter thresholds
      WHEN al.resource_type = 'customers' AND (
        al.action_type = 'bulk_query' OR 
        al.action_type = 'sensitive_access' OR
        al.action_type = 'export' OR
        COUNT(*) > 25
      ) THEN TRUE
      -- General threshold: bulk_query action OR >50 accesses in period OR >20 avg per session
      WHEN al.action_type = 'bulk_query' OR COUNT(*) > 50 OR 
           ROUND(COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT DATE_TRUNC('hour', al.created_at)), 0), 2) > 20 
      THEN TRUE
      ELSE FALSE
    END as is_anomaly,
    -- Provide reason for the anomaly
    CASE 
      WHEN al.resource_type = 'customers' AND al.action_type = 'export' THEN 'Customer data export detected'
      WHEN al.resource_type = 'customers' AND al.action_type = 'bulk_query' THEN 'Bulk customer query detected'
      WHEN al.resource_type = 'customers' AND al.action_type = 'sensitive_access' THEN 'Sensitive customer data access'
      WHEN al.resource_type = 'customers' AND COUNT(*) > 25 THEN 'High volume customer access'
      WHEN al.action_type = 'bulk_query' THEN 'Bulk data query'
      WHEN COUNT(*) > 50 THEN 'High access volume'
      WHEN ROUND(COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT DATE_TRUNC('hour', al.created_at)), 0), 2) > 20 THEN 'High session frequency'
      ELSE NULL
    END as anomaly_reason
  FROM public.access_logs al
  WHERE al.shop_id = p_shop_id
    AND al.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
  GROUP BY al.user_id, al.action_type, al.resource_type
  ORDER BY total_count DESC;
END;
$$;

-- Create a function to check for real-time customer access alerts
CREATE OR REPLACE FUNCTION public.check_customer_access_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recent_count INTEGER;
  access_threshold INTEGER := 10;
BEGIN
  -- Only check for customer-related access
  IF NEW.resource_type = 'customers' THEN
    -- Count accesses in last 5 minutes by same user
    SELECT COUNT(*) INTO recent_count
    FROM public.access_logs
    WHERE user_id = NEW.user_id
      AND resource_type = 'customers'
      AND shop_id = NEW.shop_id
      AND created_at >= NOW() - INTERVAL '5 minutes';
    
    -- If threshold exceeded, log metadata about the alert
    IF recent_count >= access_threshold THEN
      NEW.metadata = NEW.metadata || jsonb_build_object(
        'alert_triggered', true,
        'alert_type', 'high_frequency_customer_access',
        'access_count_5min', recent_count
      );
    END IF;
    
    -- Also check for bulk query or export actions
    IF NEW.action_type IN ('bulk_query', 'export') THEN
      NEW.metadata = NEW.metadata || jsonb_build_object(
        'alert_triggered', true,
        'alert_type', CASE 
          WHEN NEW.action_type = 'export' THEN 'customer_data_export'
          ELSE 'bulk_customer_access'
        END,
        'resource_count', NEW.resource_count
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for customer access alerts
DROP TRIGGER IF EXISTS customer_access_alert_trigger ON public.access_logs;
CREATE TRIGGER customer_access_alert_trigger
  BEFORE INSERT ON public.access_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.check_customer_access_alert();