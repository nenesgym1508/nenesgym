-- ============================================================================
-- 028 — Dos arreglos que salieron del análisis "¿y si el correo ya existe?".
-- ============================================================================

-- ── 1. La verdad sobre "este correo ya existe" vive en auth.users ────────────
--
-- `acceptWithPasswordAction` consultaba `profiles.email`, que NO es la fuente de
-- verdad del login y se desincroniza: `updateEmailAction` cambia el correo en
-- Auth y nunca toca `profiles`. Eso daba DOS fallos opuestos:
--   · falso negativo → el chequeo deja pasar, `updateUserById` revienta contra el
--     índice único de auth.users, y el socio ve el error de GoTrue en inglés
--     ("A user with this email address has already been registered") con el
--     consejo falso "intenta de nuevo" — reintentar nunca iba a funcionar.
--     (traducirErrorAuth no lo captura: busca "already registered" y GoTrue dice
--      "already BEEN registered".)
--   · falso positivo → se bloquea un correo que en realidad ya estaba libre, y
--     se manda al socio a iniciar sesión en una cuenta que ya no existe.
--
-- Nada se sobreescribía nunca: el índice único de auth.users es la barrera dura
-- y `updateUserById` falla de forma atómica. El problema era de diagnóstico y de
-- mensaje, no de integridad.
CREATE OR REPLACE FUNCTION public.auth_email_owner(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT u.id FROM auth.users u
   WHERE lower(u.email) = lower(trim(p_email))
   LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.auth_email_owner(text) FROM PUBLIC, anon, authenticated;

-- ── 2. El teléfono en el auto-registro ──────────────────────────────────────
--
-- `handle_new_user` no copiaba `raw_user_meta_data->>'phone'`, así que TODO
-- socio que se registraba solo quedaba con `profiles.phone = NULL`.
--
-- Consecuencia cara: la única defensa antiduplicado del alta manual es
-- `.eq("phone", phone)` contra `profiles.phone`, y NULL nunca casa. El admin
-- creaba una ficha DUPLICADA para alguien que ya existía, le cobraba el plan
-- ahí, y el socio no podía reclamarla (la RPC devuelve ACCOUNT_HAS_DATA): el
-- dinero quedaba en la ficha huérfana y solo se arreglaba a mano.
--
-- Se normaliza igual que `adminCreateClientSchema` (solo dígitos, sin el
-- indicativo 57) para que las dos vías produzcan EL MISMO valor y se puedan
-- comparar. ⚠️ Si algún día cambia esa normalización en el schema de TypeScript,
-- hay que cambiarla aquí también.
--
-- Nota: Google no entrega teléfono, así que el socio que entra con Google sigue
-- quedando con phone NULL. Para ese caso la defensa pendiente es avisar al admin
-- de un socio con nombre parecido antes de cobrar (ver ROADMAP).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_gym_id uuid;
  v_phone  text;
begin
  select id into v_gym_id from public.gyms limit 1;

  v_phone := regexp_replace(coalesce(new.raw_user_meta_data->>'phone', ''), '[^0-9]', '', 'g');
  if length(v_phone) = 12 and left(v_phone, 2) = '57' then
    v_phone := substr(v_phone, 3);
  end if;
  if length(v_phone) < 10 then
    v_phone := null;
  end if;

  insert into public.profiles (id, gym_id, role, full_name, email, phone)
  values (
    new.id,
    v_gym_id,
    'client',
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    v_phone
  );
  return new;
end;
$function$;
