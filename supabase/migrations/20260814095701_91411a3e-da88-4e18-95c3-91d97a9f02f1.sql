-- 1. is_admin becomes SECURITY INVOKER, backed by a self-read policy on admins
CREATE POLICY "Users can read their own admin record"
ON public.admins FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.admins where user_id = auth.uid());
$function$;

GRANT SELECT ON public.admins TO authenticated;

-- 2. Revoke execute on unused SECURITY DEFINER helpers
REVOKE ALL ON FUNCTION public.get_booked_times(date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_booking_by_reference(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_booking_by_reference(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_booked_times(date) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_booking_by_reference(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_booking_by_reference(uuid, text) TO service_role;