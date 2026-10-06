-- Sinais técnicos por conta (hashes, nunca IP em texto puro)
CREATE TABLE public.account_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_hash text,
  ip_hash text,
  ua_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_hash, ip_hash)
);
CREATE INDEX account_signals_device_idx ON public.account_signals(device_hash);
CREATE INDEX account_signals_ip_idx ON public.account_signals(ip_hash);
GRANT ALL ON public.account_signals TO service_role;
ALTER TABLE public.account_signals ENABLE ROW LEVEL SECURITY;

-- Sinais herdados de contas banidas
CREATE TABLE public.ban_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_user_id uuid NOT NULL,
  device_hash text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ban_signals_device_idx ON public.ban_signals(device_hash);
CREATE INDEX ban_signals_ip_idx ON public.ban_signals(ip_hash);
GRANT ALL ON public.ban_signals TO service_role;
ALTER TABLE public.ban_signals ENABLE ROW LEVEL SECURITY;

-- Risco por usuário
CREATE TABLE public.user_risk (
  user_id uuid PRIMARY KEY,
  score integer NOT NULL DEFAULT 0,
  reasons text[] NOT NULL DEFAULT '{}',
  restricted_until timestamptz,
  linked_banned_user_ids uuid[] NOT NULL DEFAULT '{}',
  reviewed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.user_risk TO service_role;
ALTER TABLE public.user_risk ENABLE ROW LEVEL SECURITY;

-- Copia sinais da conta quando ela é banida (sistema de ban existente intacto)
CREATE OR REPLACE FUNCTION public.capture_ban_signals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.banned AND NOT COALESCE(OLD.banned, false) THEN
    INSERT INTO public.ban_signals(source_user_id, device_hash, ip_hash)
    SELECT DISTINCT NEW.id, s.device_hash, s.ip_hash FROM public.account_signals s WHERE s.user_id = NEW.id;
    -- Reavalia contas que compartilham dispositivo com a banida
    PERFORM public.evaluate_account_risk(s2.user_id)
      FROM public.account_signals s2
      WHERE s2.user_id <> NEW.id AND s2.device_hash IN (SELECT device_hash FROM public.account_signals WHERE user_id = NEW.id AND device_hash IS NOT NULL);
  END IF;
  RETURN NEW;
END; $$;

-- Avalia risco a partir dos sinais
CREATE OR REPLACE FUNCTION public.evaluate_account_risk(_uid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_score int := 0;
  v_reasons text[] := '{}';
  v_linked uuid[];
  v_device_banned int;
  v_ip_banned int;
  v_device_accounts int;
  v_ip_new_accounts int;
  v_created timestamptz;
  v_restrict timestamptz;
BEGIN
  SELECT created_at INTO v_created FROM public.profiles WHERE id = _uid;
  IF v_created IS NULL THEN RETURN; END IF;

  SELECT count(DISTINCT b.source_user_id), array_agg(DISTINCT b.source_user_id)
    INTO v_device_banned, v_linked
    FROM public.ban_signals b
    JOIN public.account_signals s ON s.device_hash = b.device_hash AND s.device_hash IS NOT NULL
    WHERE s.user_id = _uid AND b.source_user_id <> _uid;

  SELECT count(DISTINCT b.source_user_id) INTO v_ip_banned
    FROM public.ban_signals b
    JOIN public.account_signals s ON s.ip_hash = b.ip_hash AND s.ip_hash IS NOT NULL
    WHERE s.user_id = _uid AND b.source_user_id <> _uid;

  SELECT count(DISTINCT o.user_id) INTO v_device_accounts
    FROM public.account_signals s
    JOIN public.account_signals o ON o.device_hash = s.device_hash AND o.user_id <> _uid
    WHERE s.user_id = _uid AND s.device_hash IS NOT NULL;

  SELECT count(DISTINCT p.id) INTO v_ip_new_accounts
    FROM public.account_signals s
    JOIN public.account_signals o ON o.ip_hash = s.ip_hash AND o.user_id <> _uid
    JOIN public.profiles p ON p.id = o.user_id AND p.created_at > now() - interval '24 hours'
    WHERE s.user_id = _uid AND s.ip_hash IS NOT NULL;

  IF v_device_banned > 0 THEN v_score := v_score + 60; v_reasons := v_reasons || 'dispositivo de conta banida'; END IF;
  IF v_ip_banned > 0 THEN v_score := v_score + 20; v_reasons := v_reasons || 'rede usada por conta banida'; END IF;
  IF v_device_accounts >= 2 THEN v_score := v_score + 15; v_reasons := v_reasons || ('várias contas no mesmo dispositivo (' || (v_device_accounts+1) || ')'); END IF;
  IF v_ip_new_accounts >= 3 THEN v_score := v_score + 10; v_reasons := v_reasons || 'muitas contas novas na mesma rede (24h)'; END IF;
  IF v_created > now() - interval '24 hours' AND v_score > 0 THEN v_score := v_score + 10; v_reasons := v_reasons || 'conta recém-criada'; END IF;

  -- Restrição temporária (nunca ban automático)
  IF v_score >= 60 THEN v_restrict := now() + interval '72 hours';
  ELSIF v_score >= 30 THEN v_restrict := now() + interval '24 hours';
  END IF;

  INSERT INTO public.user_risk(user_id, score, reasons, restricted_until, linked_banned_user_ids, updated_at)
  VALUES (_uid, v_score, v_reasons, v_restrict, COALESCE(v_linked, '{}'), now())
  ON CONFLICT (user_id) DO UPDATE SET
    score = GREATEST(EXCLUDED.score, CASE WHEN public.user_risk.reviewed THEN 0 ELSE public.user_risk.score END),
    reasons = (SELECT array_agg(DISTINCT r) FROM unnest(public.user_risk.reasons || EXCLUDED.reasons) r),
    restricted_until = CASE
      WHEN public.user_risk.reviewed AND EXCLUDED.score < 60 THEN public.user_risk.restricted_until
      ELSE GREATEST(public.user_risk.restricted_until, EXCLUDED.restricted_until) END,
    linked_banned_user_ids = EXCLUDED.linked_banned_user_ids,
    updated_at = now();
END; $$;

CREATE TRIGGER trg_capture_ban_signals
AFTER UPDATE OF banned ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.capture_ban_signals();

-- Registra sinal (chamada apenas pela função de backend com service_role)
CREATE OR REPLACE FUNCTION public.record_account_signal(_uid uuid, _device text, _ip text, _ua text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.account_signals(user_id, device_hash, ip_hash, ua_hash)
  VALUES (_uid, _device, _ip, _ua)
  ON CONFLICT (user_id, device_hash, ip_hash) DO UPDATE SET last_seen_at = now();
  -- se a conta já está banida, novos sinais dela também viram sinais de ban
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND banned) THEN
    INSERT INTO public.ban_signals(source_user_id, device_hash, ip_hash) VALUES (_uid, _device, _ip);
  END IF;
  PERFORM public.evaluate_account_risk(_uid);
END; $$;
REVOKE ALL ON FUNCTION public.record_account_signal(uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_account_signal(uuid,text,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.evaluate_account_risk(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_account_risk(uuid) TO service_role;

-- Guarda de envio aplicada no banco (complementa o rate limit existente)
CREATE OR REPLACE FUNCTION public.enforce_message_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid;
  v_text text;
  v_prof record;
  v_risk record;
  v_age interval;
  v_recent int;
  v_limit int := NULL;
  v_window interval := interval '1 minute';
  v_has_media boolean := false;
  v_same int;
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'direct_messages' THEN v_uid := NEW.sender_id; v_has_media := NEW.image_url IS NOT NULL;
  ELSE v_uid := NEW.user_id; END IF;
  IF TG_TABLE_NAME = 'group_messages' THEN v_has_media := NEW.image_url IS NOT NULL; END IF;
  IF v_uid IS NULL THEN RETURN NEW; END IF;
  v_text := COALESCE(NEW.text, '');

  SELECT banned, muted_until, role, created_at INTO v_prof FROM public.profiles WHERE id = v_uid;
  IF v_prof.role = 'admin' THEN RETURN NEW; END IF;
  IF v_prof.banned THEN
    RAISE EXCEPTION 'BANNED: Sua conta está banida.' USING ERRCODE = 'P0001';
  END IF;
  IF v_prof.muted_until IS NOT NULL AND v_prof.muted_until > now() THEN
    RAISE EXCEPTION 'MUTED: Você está silenciado no momento.' USING ERRCODE = 'P0001';
  END IF;

  v_age := now() - COALESCE(v_prof.created_at, now());
  SELECT * INTO v_risk FROM public.user_risk WHERE user_id = v_uid;

  IF v_risk.restricted_until IS NOT NULL AND v_risk.restricted_until > now() THEN
    v_limit := 2; -- conta sob suspeita: 2 msgs/min, sem links
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

  -- Spam coordenado: mesmo texto por várias contas novas em pouco tempo
  IF v_age < interval '7 days' AND char_length(btrim(v_text)) >= 8 AND TG_TABLE_NAME = 'chat_messages' THEN
    SELECT count(DISTINCT m.user_id) INTO v_same
      FROM public.chat_messages m
      JOIN public.profiles p ON p.id = m.user_id
      WHERE m.created_at > now() - interval '5 minutes'
        AND m.user_id <> v_uid
        AND lower(btrim(m.text)) = lower(btrim(v_text))
        AND p.created_at > now() - interval '7 days';
    IF v_same >= 2 THEN
      RAISE EXCEPTION 'COORDINATED_SPAM: Mensagem idêntica enviada por várias contas novas. Aguarde.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_message_guard BEFORE INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.enforce_message_guard();
CREATE TRIGGER trg_message_guard BEFORE INSERT ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.enforce_message_guard();
CREATE TRIGGER trg_message_guard BEFORE INSERT ON public.group_messages FOR EACH ROW EXECUTE FUNCTION public.enforce_message_guard();

-- Sinal comportamental: conta nova enviando muito logo após criar
CREATE OR REPLACE FUNCTION public.flag_new_account_burst()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_created timestamptz; v_cnt int;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  SELECT created_at INTO v_created FROM public.profiles WHERE id = NEW.user_id;
  IF v_created IS NULL OR v_created < now() - interval '1 hour' THEN RETURN NEW; END IF;
  SELECT count(*) INTO v_cnt FROM public.chat_messages WHERE user_id = NEW.user_id AND created_at > now() - interval '5 minutes';
  IF v_cnt >= 8 THEN
    INSERT INTO public.user_risk(user_id, score, reasons, updated_at)
    VALUES (NEW.user_id, 25, ARRAY['muitas mensagens logo após criar a conta'], now())
    ON CONFLICT (user_id) DO UPDATE SET
      score = GREATEST(public.user_risk.score, 25),
      reasons = (SELECT array_agg(DISTINCT r) FROM unnest(public.user_risk.reasons || ARRAY['muitas mensagens logo após criar a conta']) r),
      updated_at = now();
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_flag_new_account_burst AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.flag_new_account_burst();

-- RPCs do painel admin (sem expor hashes)
CREATE OR REPLACE FUNCTION public.admin_risk_overview()
RETURNS TABLE(user_id uuid, username text, created_at timestamptz, banned boolean, score int, reasons text[],
  restricted_until timestamptz, reviewed boolean, linked_banned text[], shared_device_accounts text[], updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT r.user_id, p.username, p.created_at, p.banned, r.score, r.reasons, r.restricted_until, r.reviewed,
    ARRAY(SELECT bp.username FROM public.profiles bp WHERE bp.id = ANY(r.linked_banned_user_ids)),
    ARRAY(SELECT DISTINCT op.username FROM public.account_signals s
            JOIN public.account_signals o ON o.device_hash = s.device_hash AND o.user_id <> s.user_id
            JOIN public.profiles op ON op.id = o.user_id
            WHERE s.user_id = r.user_id AND s.device_hash IS NOT NULL LIMIT 20),
    r.updated_at
  FROM public.user_risk r JOIN public.profiles p ON p.id = r.user_id
  WHERE r.score > 0 OR r.restricted_until > now()
  ORDER BY (r.restricted_until > now()) DESC NULLS LAST, r.score DESC, r.updated_at DESC
  LIMIT 200;
END; $$;
REVOKE ALL ON FUNCTION public.admin_risk_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_risk_overview() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_risk_restriction(_uid uuid, _hours int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.user_risk(user_id, score, reasons, restricted_until, reviewed, updated_at)
  VALUES (_uid, 0, '{}', CASE WHEN _hours > 0 THEN now() + make_interval(hours => _hours) END, _hours <= 0, now())
  ON CONFLICT (user_id) DO UPDATE SET
    restricted_until = CASE WHEN _hours > 0 THEN now() + make_interval(hours => _hours) ELSE NULL END,
    reviewed = _hours <= 0,
    score = CASE WHEN _hours <= 0 THEN 0 ELSE public.user_risk.score END,
    updated_at = now();
END; $$;
REVOKE ALL ON FUNCTION public.admin_set_risk_restriction(uuid,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_risk_restriction(uuid,int) TO authenticated;