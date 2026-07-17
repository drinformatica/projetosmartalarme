CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  has_super_admin boolean;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, cnpj)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'cnpj'
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') INTO has_super_admin;

  IF NOT has_super_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $function$;

-- Promote earliest existing user to super_admin if none exists yet
DO $$
DECLARE
  has_super_admin boolean;
  first_user uuid;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') INTO has_super_admin;
  IF NOT has_super_admin THEN
    SELECT id INTO first_user FROM auth.users ORDER BY created_at ASC LIMIT 1;
    IF first_user IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (first_user, 'super_admin')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Remove hardcoded super_admin from david.ramoon00 unless they are the first user
  DELETE FROM public.user_roles
  WHERE role = 'super_admin'
    AND user_id IN (SELECT id FROM auth.users WHERE lower(email) = 'david.ramoon00@gmail.com')
    AND user_id <> (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1);
END $$;