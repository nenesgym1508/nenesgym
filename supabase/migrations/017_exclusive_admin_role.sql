-- Migration 017: Enforce nenesgym1508@gmail.com as the EXCLUSIVE Admin account

-- 1. Actualizar roles existentes en profiles
UPDATE public.profiles p
SET role = 'admin'
FROM auth.users u
WHERE p.id = u.id AND LOWER(u.email) = 'nenesgym1508@gmail.com';

UPDATE public.profiles p
SET role = 'client'
FROM auth.users u
WHERE p.id = u.id AND LOWER(u.email) != 'nenesgym1508@gmail.com' AND p.role = 'admin';

-- 2. Función y Trigger para garantizar que SOLO nenesgym1508@gmail.com pueda tener rol 'admin'
CREATE OR REPLACE FUNCTION public.enforce_exclusive_admin_role()
RETURNS TRIGGER AS $$
DECLARE
  user_email text;
BEGIN
  -- Obtener el email del usuario desde auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;

  IF LOWER(COALESCE(user_email, '')) = 'nenesgym1508@gmail.com' THEN
    NEW.role := 'admin';
  ELSE
    IF NEW.role = 'admin' THEN
      NEW.role := 'client';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Asignar trigger a la tabla profiles
DROP TRIGGER IF EXISTS trg_enforce_exclusive_admin_role ON public.profiles;

CREATE TRIGGER trg_enforce_exclusive_admin_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_exclusive_admin_role();
