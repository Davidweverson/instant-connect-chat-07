CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.banned IS DISTINCT FROM OLD.banned
     OR NEW.muted_until IS DISTINCT FROM OLD.muted_until THEN
    RAISE EXCEPTION 'FORBIDDEN: Você não pode alterar campos de moderação.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $function$;