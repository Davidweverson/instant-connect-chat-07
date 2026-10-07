CREATE TABLE public.risk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX risk_events_created_idx ON public.risk_events(created_at DESC);
GRANT ALL ON public.risk_events TO service_role;
ALTER TABLE public.risk_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.capture_ban_signals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_n int;
BEGIN
  IF NEW.banned AND NOT COALESCE(OLD.banned, false) THEN
    INSERT INTO public.ban_signals(source_user_id, device_hash, ip_hash)
    SELECT DISTINCT NEW.id, s.device_hash, s.ip_hash FROM public.account_signals s WHERE s.user_id = NEW.id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    INSERT INTO public.risk_events(user_id, event, detail) VALUES (NEW.id, 'ban_captured', jsonb_build_object('signals', v_n));
    PERFORM public.evaluate_account_risk(s2.user_id)
      FROM (SELECT DISTINCT o.user_id FROM public.account_signals o
            WHERE o.user_id <> NEW.id
              AND (o.device_hash IN (SELECT device_hash FROM public.account_signals WHERE user_id = NEW.id AND device_hash IS NOT NULL)
                OR o.ip_hash IN (SELECT ip_hash FROM public.account_signals WHERE user_id = NEW.id AND ip_hash IS NOT NULL))) s2;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.record_account_signal(_uid uuid, _device text, _ip text, _ua text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_dev_match int; v_ip_match int;
BEGIN
  INSERT INTO public.account_signals(user_id, device_hash, ip_hash, ua_hash)
  VALUES (_uid, _device, _ip, _ua)
  ON CONFLICT (user_id, device_hash, ip_hash) DO UPDATE SET last_seen_at = now();
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND banned) THEN
    INSERT INTO public.ban_signals(source_user_id, device_hash, ip_hash) VALUES (_uid, _device, _ip);
  END IF;
  SELECT count(*) INTO v_dev_match FROM public.ban_signals WHERE device_hash = _device AND source_user_id <> _uid;
  SELECT count(*) INTO v_ip_match FROM public.ban_signals WHERE ip_hash = _ip AND source_user_id <> _uid;
  INSERT INTO public.risk_events(user_id, event, detail) VALUES (_uid, 'signal_registered',
    jsonb_build_object('has_device', _device IS NOT NULL, 'has_ip', _ip IS NOT NULL,
      'banned_device_matches', v_dev_match, 'banned_ip_matches', v_ip_match));
  PERFORM public.evaluate_account_risk(_uid);
END; $$;

-- Log de avaliação: envolve a função existente
CREATE OR REPLACE FUNCTION public.log_risk_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.score IS DISTINCT FROM OLD.score OR NEW.restricted_until IS DISTINCT FROM OLD.restricted_until THEN
    INSERT INTO public.risk_events(user_id, event, detail) VALUES (NEW.user_id, 'risk_evaluated',
      jsonb_build_object('score', NEW.score, 'reasons', NEW.reasons, 'restricted_until', NEW.restricted_until));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_log_risk_change AFTER INSERT OR UPDATE ON public.user_risk FOR EACH ROW EXECUTE FUNCTION public.log_risk_change();

-- Guard: contas novas sem nenhum sinal registrado ficam limitadas (não bloqueadas)
CREATE OR REPLACE FUNCTION public.enforce_message_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid; v_text text; v_prof record; v_risk record; v_age interval;
  v_recent int; v_limit int := NULL; v_window interval := interval '1 minute';
  v_same int; v_restricted boolean := false;
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'direct_messages' THEN v_uid := NEW.sender_id; ELSE v_uid := NEW.user_id; END IF;
  IF v_uid IS NULL THEN RETURN NEW; END IF;
  v_text := COALESCE(NEW.text, '');

  SELECT banned, muted_until, role, created_at INTO v_prof FROM public.profiles WHERE id = v_uid;
  IF v_prof.role = 'admin' THEN RETURN NEW; END IF;
  IF v_prof.banned THEN RAISE EXCEPTION 'BANNED: Sua conta está banida.' USING ERRCODE = 'P0001'; END IF;
  IF v_prof.muted_until IS NOT NULL AND v_prof.muted_until > now() THEN
    RAISE EXCEPTION 'MUTED: Você está silenciado no momento.' USING ERRCODE = 'P0001';
  END IF;

  v_age := now() - COALESCE(v_prof.created_at, now());
  SELECT * INTO v_risk FROM public.user_risk WHERE user_id = v_uid;
  v_restricted := v_risk.restricted_until IS NOT NULL AND v_risk.restricted_until > now();

  -- Conta nova que nunca registrou dispositivo: trata como limitada
  IF NOT v_restricted AND v_age < interval '24 hours'
     AND NOT EXISTS (SELECT 1 FROM public.account_signals WHERE user_id = v_uid) THEN
    v_restricted := true;
  END IF;

  IF v_restricted THEN
    v_limit := 2;
    IF v_text ~* '(https?://|www\.|discord\.gg)' THEN
      RAISE EXCEPTION 'RESTRICTED: Sua conta está temporariamente limitada e não pode enviar links.' USING ERRCODE = 'P0001';
    END IF;
  ELSIF v_age < interval '10 minutes' THEN
    v_limit := 4;
    IF v_text ~* '(https?://|www\.|discord\.gg)' THEN
      RAISE EXCEPTION 'NEW_ACCOUNT: Contas novas precisam esperar 10 minutos para enviar links.' USING ERRCODE = 'P0001';
    END IF;
  ELSIF v_age < interval '24 hours' THEN
    v_limit := 10;
  END IF;

  IF v_limit IS NOT NULL THEN
    SELECT
      (SELECT count(*) FROM public.chat_messages WHERE user_id = v_uid AND created_at > now() - v_window) +
      (SELECT count(*) FROM public.direct_messages WHERE sender_id = v_uid AND created_at > now() - v_window) +
      (SELECT count(*) FROM public.group_messages WHERE user_id = v_uid AND created_at > now() - v_window)
    INTO v_recent;
    IF v_recent >= v_limit THEN
      RAISE EXCEPTION 'NEW_ACCOUNT_LIMIT: Contas novas ou limitadas têm um limite menor de mensagens. Aguarde um pouco.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF v_age < interval '7 days' AND char_length(btrim(v_text)) >= 8 AND TG_TABLE_NAME = 'chat_messages' THEN
    SELECT count(DISTINCT m.user_id) INTO v_same
      FROM public.chat_messages m JOIN public.profiles p ON p.id = m.user_id
      WHERE m.created_at > now() - interval '5 minutes' AND m.user_id <> v_uid
        AND lower(btrim(m.text)) = lower(btrim(v_text)) AND p.created_at > now() - interval '7 days';
    IF v_same >= 2 THEN
      RAISE EXCEPTION 'COORDINATED_SPAM: Mensagem idêntica enviada por várias contas novas. Aguarde.' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_risk_events(_limit int DEFAULT 50)
RETURNS TABLE(username text, event text, detail jsonb, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT p.username, e.event, e.detail, e.created_at
    FROM public.risk_events e LEFT JOIN public.profiles p ON p.id = e.user_id
    ORDER BY e.created_at DESC LIMIT LEAST(_limit, 200);
END; $$;
REVOKE ALL ON FUNCTION public.admin_risk_events(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_risk_events(int) TO authenticated;