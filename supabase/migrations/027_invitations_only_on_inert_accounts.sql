-- ============================================================================
-- 027 — Una invitación SOLO puede apuntar a una cuenta inerte.
--
-- ⚠️ CIERRA UN AGUJERO CRÍTICO INTRODUCIDO POR LA 026. Detectado en la revisión
-- adversarial del mismo día y verificado contra producción antes y después.
--
-- El fallo: `accept_client_invitation` repuntaba `clients.profile_id` sin
-- comprobar que el dueño actual de la ficha fuera una cuenta creada por el
-- gimnasio y nunca usada. Encadenado con `getClientAccessState`, que deducía
-- "activo" SOLO de si había una invitación aceptada, el resultado era:
--
--   1. Un socio se registra ÉL MISMO (por /register o con Google). Tiene ficha
--      propia y CERO invitaciones.
--   2. La ficha del admin lo mostraba como "Sin activar" y ofrecía "Enviar
--      invitación" — sobre un socio que ya tenía su cuenta.
--   3. Quien abriera ese enlace (número mal tecleado, mensaje reenviado):
--      · por Google  → se quedaba con la ficha entera y el socio legítimo
--        perdía membresía, pagos, asistencias y progreso;
--      · por correo  → `acceptWithPasswordAction` hacía `updateUserById` sobre
--        la cuenta VIVA: toma de control del login del socio.
--
-- Verificado en producción que la condición existía: la cuenta
-- andersonrua12@gmail.com (socio auto-registrado con Google, last_sign_in_at
-- 2026-08-06, 0 invitaciones) salía como "sin activar" e invitable.
--
-- Definición de "inerte" = cuenta que el gimnasio creó y que nadie ha usado:
--   * auth.users.last_sign_in_at IS NULL   → nadie ha entrado jamás, y
--   * ninguna identidad distinta de 'email' → nadie ha vinculado Google.
--
-- ⚠️ NO sirve mirar solo el correo marcador: el admin puede dar de alta a un
-- socio con su correo real, y esa cuenta también es inerte. El correo marcador
-- significa "sin correo propio", no "sin acceso".
-- ============================================================================

CREATE OR REPLACE FUNCTION public.client_account_is_claimable(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.clients c
      JOIN auth.users u ON u.id = c.profile_id
     WHERE c.id = p_client_id
       AND u.last_sign_in_at IS NULL
       AND NOT EXISTS (
             SELECT 1 FROM auth.identities i
              WHERE i.user_id = u.id AND i.provider <> 'email'
           )
  );
$function$;

REVOKE ALL ON FUNCTION public.client_account_is_claimable(uuid) FROM PUBLIC, anon, authenticated;

-- ── create_client_invitation: no emitir enlaces contra cuentas en uso ────────
-- Además, el INSERT pasa a ir envuelto: dos "Generar invitación" concurrentes
-- pueden pasar ambos el revoke y chocar contra idx_client_invitations_one_live.
-- Sin el bloque, el segundo devolvía un error crudo de Postgres en vez del
-- jsonb que espera el resto del flujo.
CREATE OR REPLACE FUNCTION public.create_client_invitation(
  p_client_id  uuid,
  p_token_hash text,
  p_ttl_hours  int DEFAULT 168
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
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED', 'message', 'No tienes permiso.');
  end if;

  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'code', 'BAD_TOKEN', 'message', 'Token invalido.');
  end if;

  select gym_id into v_gym_id from public.clients
   where id = p_client_id and gym_id = (select public.current_gym_id());

  if v_gym_id is null then
    return jsonb_build_object('ok', false, 'code', 'CLIENT_NOT_FOUND', 'message', 'El socio no existe.');
  end if;

  if exists (select 1 from public.client_invitations
              where client_id = p_client_id and accepted_at is not null) then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_LINKED',
      'message', 'Este socio ya vinculo su cuenta.');
  end if;

  -- GUARDA CRÍTICA
  if not public.client_account_is_claimable(p_client_id) then
    return jsonb_build_object('ok', false, 'code', 'HAS_REAL_ACCOUNT',
      'message', 'Este socio ya tiene su propia cuenta activa. No necesita invitacion.');
  end if;

  update public.client_invitations
     set revoked_at = now(), revoked_by = v_admin
   where client_id = p_client_id and accepted_at is null and revoked_at is null;

  begin
    insert into public.client_invitations
      (gym_id, client_id, token_hash, created_by, expires_at)
    values
      (v_gym_id, p_client_id, p_token_hash, v_admin,
       now() + make_interval(hours => greatest(1, least(coalesce(p_ttl_hours, 168), 336))))
    returning * into v_inv;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'CONFLICT',
      'message', 'Ya se estaba generando otra invitacion para este socio. Intenta de nuevo.');
  end;

  return jsonb_build_object('ok', true, 'code', 'CREATED',
    'invitation_id', v_inv.id, 'expires_at', v_inv.expires_at);
end;
$function$;

REVOKE ALL ON FUNCTION public.create_client_invitation(uuid, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_client_invitation(uuid, text, int) TO authenticated;

-- ── accept_client_invitation: misma guarda, defensa en profundidad ──────────
-- Se comprueba también al aceptar porque entre emitir y aceptar pueden pasar
-- días (la cuenta puede haberse activado por otra vía) y porque cubre las
-- invitaciones emitidas antes de esta migración.
--
-- Colocación: DESPUÉS del check de ALREADY_OWNER. Si el aceptante ya es el
-- dueño de la ficha, su cuenta está viva por definición y hay que dejarle
-- marcar la invitación como aceptada.
--
-- Cuerpo completo, tal cual queda aplicado en producción:
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
      'message', 'Inicia sesion para aceptar la invitacion.');
  end if;

  if p_token is null or char_length(p_token) < 20 then
    return jsonb_build_object('ok', false, 'code', 'INVALID',
      'message', 'El enlace no es valido.');
  end if;

  v_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');

  select * into v_inv from public.client_invitations
   where token_hash = v_hash for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'INVALID',
      'message', 'Este enlace no existe o fue reemplazado por uno nuevo.');
  end if;

  if v_inv.accepted_at is not null then
    if v_inv.accepted_by = v_user then
      return jsonb_build_object('ok', true, 'code', 'ALREADY_ACCEPTED',
        'client_id', v_inv.client_id, 'duplicate', true);
    end if;
    return jsonb_build_object('ok', false, 'code', 'ALREADY_USED',
      'message', 'Este enlace ya fue usado por otra cuenta.');
  end if;

  if v_inv.revoked_at is not null then
    return jsonb_build_object('ok', false, 'code', 'REVOKED',
      'message', 'Este enlace ya no esta disponible.');
  end if;

  if v_inv.expires_at <= now() then
    return jsonb_build_object('ok', false, 'code', 'EXPIRED',
      'message', 'Este enlace ha vencido. Solicita al gimnasio una nueva invitacion.');
  end if;

  update public.client_invitations set attempts = attempts + 1 where id = v_inv.id;

  select role into v_role from public.profiles where id = v_user;

  if v_role is null then
    return jsonb_build_object('ok', false, 'code', 'NO_PROFILE',
      'message', 'Tu cuenta todavia se esta preparando. Reintenta en unos segundos.');
  end if;

  if v_role = 'admin' then
    return jsonb_build_object('ok', false, 'code', 'IS_ADMIN',
      'message', 'La cuenta del gimnasio no puede aceptar invitaciones de socio.');
  end if;

  select id into v_stray_id from public.clients where profile_id = v_user;

  if v_stray_id = v_inv.client_id then
    update public.client_invitations
       set accepted_at = now(), accepted_by = v_user where id = v_inv.id;
    return jsonb_build_object('ok', true, 'code', 'ALREADY_OWNER',
      'client_id', v_inv.client_id);
  end if;

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
       set accepted_at = now(), accepted_by = v_user where id = v_inv.id;
    return jsonb_build_object('ok', true, 'code', 'ALREADY_OWNER',
      'client_id', v_inv.client_id);
  end if;

  -- GUARDA CRÍTICA (defensa en profundidad; la misma que hay al emitir).
  if not public.client_account_is_claimable(v_inv.client_id) then
    return jsonb_build_object('ok', false, 'code', 'HAS_REAL_ACCOUNT',
      'message', 'Esta ficha ya pertenece a una cuenta activa. Comunicate con NENE''S GYM.');
  end if;

  if v_stray_id is not null then
    if public.client_has_history(v_stray_id) then
      return jsonb_build_object('ok', false, 'code', 'ACCOUNT_HAS_DATA',
        'message', 'Esta cuenta ya es socio del gimnasio y tiene historial propio.');
    end if;

    if exists (select 1 from public.client_invitations
                where client_id = v_stray_id and accepted_at is not null) then
      return jsonb_build_object('ok', false, 'code', 'ALREADY_LINKED',
        'message', 'Esta cuenta ya esta vinculada a otro socio.');
    end if;
  end if;

  begin
    if v_stray_id is not null then
      delete from public.clients where id = v_stray_id;
    end if;

    update public.clients
       set profile_id = v_user, updated_at = now()
     where id = v_inv.client_id;
  exception when unique_violation or foreign_key_violation then
    return jsonb_build_object('ok', false, 'code', 'CONFLICT',
      'message', 'No se pudo completar la vinculacion. Intenta de nuevo.');
  end;

  select full_name, phone into v_name, v_phone
    from public.profiles where id = v_old_profile;

  update public.profiles
     set full_name  = coalesce(v_name,  full_name),
         phone      = coalesce(v_phone, phone),
         gym_id     = v_target.gym_id,
         updated_at = now()
   where id = v_user;

  update public.client_invitations
     set accepted_at = now(), accepted_by = v_user, replaced_profile_id = v_old_profile
   where id = v_inv.id;

  return jsonb_build_object('ok', true, 'code', 'ACCEPTED',
    'client_id', v_inv.client_id, 'replaced_profile_id', v_old_profile);
end;
$function$;

REVOKE ALL ON FUNCTION public.accept_client_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_client_invitation(text) TO authenticated;
