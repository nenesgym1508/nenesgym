-- Permite a la app saber si la cuenta autenticada ya tiene contraseña propia
-- (las cuentas creadas solo con Google no tienen `encrypted_password`).
-- Devuelve únicamente un booleano del PROPIO usuario: no expone el hash ni
-- datos de otros usuarios.
--
-- Se usa en "Más > Mi cuenta" para decidir qué formulario mostrar:
--   false → crear contraseña (nueva + confirmación)
--   true  → cambiar contraseña (actual + nueva)
create or replace function public.current_user_has_password()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (
      select u.encrypted_password is not null and u.encrypted_password <> ''
      from auth.users u
      where u.id = (select auth.uid())
    ),
    false
  );
$$;

revoke all on function public.current_user_has_password() from public, anon;
grant execute on function public.current_user_has_password() to authenticated;
