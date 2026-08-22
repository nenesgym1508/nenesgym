-- ============================================================================
-- 026 — Invitaciones de acceso para socios dados de alta por el admin.
--
-- Problema: un socio creado desde el panel tiene una cuenta marcador
-- (slug.abc123@socios.nenesgym.com) con contraseña aleatoria que nadie conoce.
-- Existe en el gimnasio pero no puede entrar a la app. Este módulo le entrega
-- su ficha REAL — con todo el historial — a una cuenta suya.
--
-- Por qué "repuntar" y no "fusionar": 11 tablas cuelgan de clients.id
-- (attendance, memberships, payments, progress_*, client_routine*, exercises,
-- receipt_verdicts, client_exercise_library, client_training_routine_favorites).
-- NINGUNA cuelga de profiles.id salvo clients.profile_id y payments.reviewed_by.
-- Mover clients.profile_id conserva el 100% del historial con un solo UPDATE.
--
-- El obstáculo: clients.profile_id es NOT NULL y UNIQUE, y el perfil que llega
-- ya viene con su propia fila de clients (la crea el trigger de auth.users).
-- Hay que BORRAR esa fila antes de repuntar, y solo se puede borrar si está
-- demostradamente vacía. De ahí client_has_history().
-- ============================================================================

-- ── Tabla ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_invitations (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id              UUID        NOT NULL REFERENCES gyms(id),
  client_id           UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  -- sha256 hex del token. El token en claro NUNCA se guarda: si se filtra un
  -- backup de esta tabla, los enlaces vivos siguen siendo inservibles.
  token_hash          TEXT        NOT NULL UNIQUE,
  created_by          UUID        NOT NULL REFERENCES profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ NOT NULL,
  accepted_at         TIMESTAMPTZ,
  accepted_by         UUID        REFERENCES profiles(id),
  revoked_at          TIMESTAMPTZ,
  revoked_by          UUID        REFERENCES profiles(id),
  -- Perfil marcador que quedó atrás al repuntar. Es lo que hace REVERSIBLE la
  -- vinculación: invitar al socio equivocado es el error humano más probable
  -- de todo esto. Por eso tampoco se borra el usuario de auth marcador.
  replaced_profile_id UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  attempts            INT         NOT NULL DEFAULT 0,
  CONSTRAINT client_invitations_hash_len   CHECK (char_length(token_hash) = 64),
  CONSTRAINT client_invitations_ttl_future CHECK (expires_at > created_at)
);

-- Máximo UNA invitación viva por socio. Emitir una nueva revoca la anterior
-- (ver create_client_invitation) — si no, quedarían dos enlaces válidos y
-- revocar uno daría falsa sensación de seguridad.
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_invitations_one_live
  ON client_invitations (client_id)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_client_invitations_client
  ON client_invitations (client_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_client_invitations" ON client_invitations;
CREATE POLICY "admin_all_client_invitations" ON client_invitations FOR ALL
  USING (gym_id = (SELECT current_gym_id()) AND (SELECT is_admin()))
  WITH CHECK (gym_id = (SELECT current_gym_id()) AND (SELECT is_admin()));

-- NO hay policy de cliente, ni siquiera de SELECT. A propósito: si un socio
-- pudiera leer esta tabla podría cosechar hashes. Todo el acceso del invitado
-- pasa por las funciones SECURITY DEFINER de abajo.

-- ============================================================================
-- client_has_history — ¿esta ficha de socio tiene algo que perder?
--
-- Enumera las 11 tablas a mano, sin trucos dinámicos: es la única barrera entre
-- "descartar una ficha vacía" y "borrar el historial de alguien".
-- ⚠️ Si mañana se añade una tabla hija de clients, HAY QUE AÑADIRLA AQUÍ.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.client_has_history(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p_client_id IS NOT NULL AND (
       EXISTS (SELECT 1 FROM attendance                        WHERE client_id = p_client_id)
    OR EXISTS (SELECT 1 FROM memberships                       WHERE client_id = p_client_id)
    OR EXISTS (SELECT 1 FROM payments                          WHERE client_id = p_client_id)
    OR EXISTS (SELECT 1 FROM progress_records                  WHERE client_id = p_client_id)
    OR EXISTS (SELECT 1 FROM progress_goals                    WHERE client_id = p_client_id)
    OR EXISTS (SELECT 1 FROM client_routines                   WHERE client_id = p_client_id)
    OR EXISTS (SELECT 1 FROM client_routine_sessions           WHERE client_id = p_client_id)
    OR EXISTS (SELECT 1 FROM client_exercise_library           WHERE client_id = p_client_id)
    OR EXISTS (SELECT 1 FROM client_training_routine_favorites WHERE client_id = p_client_id)
    OR EXISTS (SELECT 1 FROM receipt_verdicts                  WHERE client_id = p_client_id)
    OR EXISTS (SELECT 1 FROM exercises                         WHERE owner_client_id = p_client_id)
  );
$function$;

-- ============================================================================
-- create_client_invitation — emite el enlace.
--
-- La llama el ADMIN con su propia sesión (no service-role): auth.uid() alimenta
-- created_by, y is_admin() decide.
--
-- ⚠️ ORDEN DE BLOQUEOS: aquí NO se hace FOR UPDATE sobre clients, solo se lee.
-- Si lo hiciera, esta función tomaría clients → client_invitations mientras
-- accept_client_invitation toma client_invitations → clients: ciclo de deadlock
-- entre "el admin regenera el enlace" y "el socio lo acepta" en el mismo
-- instante. La lectura sin lock es suficiente.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_client_invitation(
  p_client_id  uuid,
  p_token_hash text,
  p_ttl_hours  int DEFAULT 168   -- 7 días
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_admin  uuid := auth.uid();
  v_gym_id uuid;
  v_inv    public.client_invitations%rowtype;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED',
      'message', 'No tienes permiso.');
  end if;

  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'code', 'BAD_TOKEN',
      'message', 'Token inválido.');
  end if;

  select gym_id into v_gym_id
    from public.clients
   where id = p_client_id
     and gym_id = (select public.current_gym_id());

  if v_gym_id is null then
    return jsonb_build_object('ok', false, 'code', 'CLIENT_NOT_FOUND',
      'message', 'El socio no existe.');
  end if;

  if exists (select 1 from public.client_invitations
              where client_id = p_client_id and accepted_at is not null) then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_LINKED',
      'message', 'Este socio ya vinculó su cuenta.');
  end if;

  -- Regenerar = revocar la viva + emitir la nueva, atómicamente. En dos
  -- llamadas desde Node habría una ventana con cero o dos enlaces válidos.
  update public.client_invitations
     set revoked_at = now(), revoked_by = v_admin
   where client_id = p_client_id
     and accepted_at is null
     and revoked_at is null;

  insert into public.client_invitations
    (gym_id, client_id, token_hash, created_by, expires_at)
  values
    (v_gym_id, p_client_id, p_token_hash, v_admin,
     now() + make_interval(hours => greatest(1, least(coalesce(p_ttl_hours, 168), 336))))
  returning * into v_inv;

  return jsonb_build_object('ok', true, 'code', 'CREATED',
    'invitation_id', v_inv.id,
    'expires_at',    v_inv.expires_at);
end;
$function$;

-- ============================================================================
-- accept_client_invitation — el corazón.
--
-- ⚠️ Recibe el token EN CLARO, no el hash, y hashea dentro. sha256() es función
-- core de PostgreSQL desde la 11 (pgcrypto solo hace falta para digest()).
-- Si recibiera el hash, el hash SERÍA la credencial y hashear no protegería de
-- nada. Debe coincidir byte a byte con el createHash("sha256") de Node.
--
-- ⚠️ NO recibe el id del usuario: lo lee de auth.uid(). Si lo aceptara como
-- parámetro, cualquier autenticado con un token podría vincular la invitación a
-- OTRO usuario. Consecuencia práctica: hay que llamarla con el cliente de
-- SESIÓN del invitado, nunca con service-role (ahí auth.uid() es NULL y
-- devuelve UNAUTHENTICATED, que es lo correcto).
--
-- Orden de bloqueos, siempre el mismo:
--   1) client_invitations (por token_hash)
--   2) clients, las filas implicadas EN ORDEN ASCENDENTE DE id
--   3) profiles
-- Dos aceptaciones cruzadas toman los mismos ids en el mismo orden: sin ciclo.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.accept_client_invitation(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_user        uuid := auth.uid();
  v_hash        text;
  v_inv         public.client_invitations%rowtype;
  v_target      public.clients%rowtype;
  v_stray_id    uuid;
  v_old_profile uuid;
  v_role        public.user_role;
  v_ids         uuid[];
  v_id          uuid;
  v_name        text;
  v_phone       text;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHENTICATED',
      'message', 'Inicia sesión para aceptar la invitación.');
  end if;

  if p_token is null or char_length(p_token) < 20 then
    return jsonb_build_object('ok', false, 'code', 'INVALID',
      'message', 'El enlace no es válido.');
  end if;

  v_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');

  -- ── LOCK 1 ────────────────────────────────────────────────────────────────
  select * into v_inv
    from public.client_invitations
   where token_hash = v_hash
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'INVALID',
      'message', 'Este enlace no existe o fue reemplazado por uno nuevo.');
  end if;

  if v_inv.accepted_at is not null then
    -- Reintento del MISMO usuario (doble pestaña, botón atrás, reenvío del
    -- callback): éxito idempotente. De otro usuario: enlace quemado.
    if v_inv.accepted_by = v_user then
      return jsonb_build_object('ok', true, 'code', 'ALREADY_ACCEPTED',
        'client_id', v_inv.client_id, 'duplicate', true);
    end if;
    return jsonb_build_object('ok', false, 'code', 'ALREADY_USED',
      'message', 'Este enlace ya fue usado por otra cuenta.');
  end if;

  if v_inv.revoked_at is not null then
    return jsonb_build_object('ok', false, 'code', 'REVOKED',
      'message', 'Este enlace ya no está disponible.');
  end if;

  if v_inv.expires_at <= now() then
    return jsonb_build_object('ok', false, 'code', 'EXPIRED',
      'message', 'Este enlace ha vencido. Solicita al gimnasio una nueva invitación.');
  end if;

  -- Los return de error NO abortan la transacción, así que este contador
  -- persiste también en los caminos fallidos — que es justo lo que se quiere
  -- para que el admin vea en la ficha que algo está pasando.
  update public.client_invitations set attempts = attempts + 1 where id = v_inv.id;

  select role into v_role from public.profiles where id = v_user;

  if v_role is null then
    -- El trigger de auth.users aún no ha corrido, o falló. No se inventa un
    -- perfil aquí: el llamador (callback) ya hace un upsert correctivo.
    return jsonb_build_object('ok', false, 'code', 'NO_PROFILE',
      'message', 'Tu cuenta todavía se está preparando. Reintenta en unos segundos.');
  end if;

  -- La cuenta del gimnasio no puede quedarse una ficha de socio:
  -- admin_search_clients hace JOIN profiles ON p.role = 'client', así que el
  -- socio desaparecería para siempre de la lista del admin.
  if v_role = 'admin' then
    return jsonb_build_object('ok', false, 'code', 'IS_ADMIN',
      'message', 'La cuenta del gimnasio no puede aceptar invitaciones de socio.');
  end if;

  -- Ficha que el trigger de auth.users creó para el aceptante. Puede no existir.
  select id into v_stray_id from public.clients where profile_id = v_user;

  if v_stray_id = v_inv.client_id then
    update public.client_invitations
       set accepted_at = now(), accepted_by = v_user
     where id = v_inv.id;
    return jsonb_build_object('ok', true, 'code', 'ALREADY_OWNER',
      'client_id', v_inv.client_id);
  end if;

  -- ── LOCK 2: orden ascendente de id, explícito ─────────────────────────────
  v_ids := array_remove(array[v_inv.client_id, v_stray_id], null);
  for v_id in select unnest(v_ids) order by 1 loop
    perform 1 from public.clients where id = v_id for update;
  end loop;

  select * into v_target from public.clients where id = v_inv.client_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'CLIENT_GONE',
      'message', 'El socio ya no existe.');
  end if;

  if v_target.gym_id <> v_inv.gym_id then
    return jsonb_build_object('ok', false, 'code', 'GYM_MISMATCH',
      'message', 'Datos inconsistentes. Avisa al gimnasio.');
  end if;

  v_old_profile := v_target.profile_id;

  if v_old_profile = v_user then
    update public.client_invitations
       set accepted_at = now(), accepted_by = v_user
     where id = v_inv.id;
    return jsonb_build_object('ok', true, 'code', 'ALREADY_OWNER',
      'client_id', v_inv.client_id);
  end if;

  if v_stray_id is not null then
    -- Barrera dura: nunca se descarta una ficha con historial.
    if public.client_has_history(v_stray_id) then
      return jsonb_build_object('ok', false, 'code', 'ACCOUNT_HAS_DATA',
        'message', 'Esta cuenta ya es socio del gimnasio y tiene historial propio. '
                || 'Comunícate con NENE''S GYM.');
    end if;

    -- Una cuenta = un socio. Sin esto, una segunda invitación aceptada por el
    -- mismo Google BORRARÍA la ficha ganada con la primera (que estaría vacía
    -- si el socio aún no la ha usado). Es el agujero menos obvio de todo esto.
    if exists (select 1 from public.client_invitations
                where client_id = v_stray_id and accepted_at is not null) then
      return jsonb_build_object('ok', false, 'code', 'ALREADY_LINKED',
        'message', 'Esta cuenta ya está vinculada a otro socio.');
    end if;
  end if;

  -- ── Traspaso ──────────────────────────────────────────────────────────────
  -- DELETE antes de UPDATE es obligatorio: clients.profile_id es UNIQUE, así
  -- que el perfil nuevo tiene que quedar libre primero. Ambos en el mismo
  -- bloque para que una unique_violation revierta LOS DOS.
  begin
    if v_stray_id is not null then
      delete from public.clients where id = v_stray_id;
    end if;

    update public.clients
       set profile_id = v_user,
           updated_at = now()
     where id = v_inv.client_id;
  exception when unique_violation or foreign_key_violation then
    return jsonb_build_object('ok', false, 'code', 'CONFLICT',
      'message', 'No se pudo completar la vinculación. Intenta de nuevo.');
  end;

  -- ── Identidad ─────────────────────────────────────────────────────────────
  -- Manda lo que escribió el admin, no lo que dice Google. "Copiar solo si
  -- falta" NO sirve: Google siempre trae full_name, así que nunca copiaría y el
  -- gimnasio perdería el nombre con el que busca al socio en su lista.
  -- El EMAIL sí se queda con el nuevo (ese es justo el punto de vincular).
  select full_name, phone into v_name, v_phone
    from public.profiles where id = v_old_profile;

  update public.profiles
     set full_name  = coalesce(v_name,  full_name),
         phone      = coalesce(v_phone, phone),
         gym_id     = v_target.gym_id,
         updated_at = now()
   where id = v_user;

  update public.client_invitations
     set accepted_at         = now(),
         accepted_by         = v_user,
         replaced_profile_id = v_old_profile
   where id = v_inv.id;

  return jsonb_build_object('ok', true, 'code', 'ACCEPTED',
    'client_id',           v_inv.client_id,
    'replaced_profile_id', v_old_profile);
end;
$function$;

-- ── Permisos ────────────────────────────────────────────────────────────────
-- anon NUNCA ejecuta nada de esto. La pantalla pública /invitacion/[token] lee
-- con service-role desde el servidor de Next, no con la API pública: así no
-- queda ninguna función de invitaciones invocable por un anónimo.
REVOKE ALL ON FUNCTION public.client_has_history(uuid)                  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_client_invitation(uuid, text, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_client_invitation(text)            FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.create_client_invitation(uuid, text, int) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.accept_client_invitation(text)            TO authenticated;
