-- Fix: Update get_user_shop_id to only return shop_id for active staff members
CREATE OR REPLACE FUNCTION public.get_user_shop_id(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.current_shop_id 
  FROM public.profiles p
  WHERE p.id = _user_id
    AND (
      -- Super admin always gets access
      public.is_super_admin(_user_id)
      OR
      -- Regular users must have active shop_staff record for their current_shop_id
      EXISTS (
        SELECT 1 FROM public.shop_staff ss
        WHERE ss.user_id = _user_id
          AND ss.shop_id = p.current_shop_id
          AND ss.is_active = true
      )
    )
$function$;