INSERT INTO public.activation_codes (code, plan, duration_days, max_uses, used_count, note, active, expires_at)
VALUES ('UUXZ@272', 'yearly', 3650, 2147483647, 0, 'Fixed administrator recovery serial', true, NULL)
ON CONFLICT (code) DO UPDATE SET
  plan = EXCLUDED.plan,
  duration_days = EXCLUDED.duration_days,
  max_uses = EXCLUDED.max_uses,
  note = EXCLUDED.note,
  active = true,
  expires_at = NULL;

DO $$
DECLARE
  v_user_id uuid;
  v_code_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = 'uuxz272@gmail.com' LIMIT 1;
  SELECT id INTO v_code_id FROM public.activation_codes WHERE code = 'UUXZ@272' LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.code_redemptions (code_id, user_id)
    SELECT v_code_id, v_user_id
    WHERE v_code_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.code_redemptions
        WHERE code_id = v_code_id AND user_id = v_user_id
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_id uuid;
BEGIN
  INSERT INTO public.profiles (id, teacher_name, school)
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'teacher_name', ''), coalesce(new.raw_user_meta_data->>'school', ''))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.subscriptions (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  IF lower(coalesce(new.email, '')) = 'uuxz272@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.activation_codes (code, plan, duration_days, max_uses, used_count, note, active, expires_at)
    VALUES ('UUXZ@272', 'yearly', 3650, 2147483647, 0, 'Fixed administrator recovery serial', true, NULL)
    ON CONFLICT (code) DO UPDATE SET active = true, expires_at = NULL
    RETURNING id INTO v_code_id;

    INSERT INTO public.code_redemptions (code_id, user_id)
    SELECT v_code_id, new.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.code_redemptions
      WHERE code_id = v_code_id AND user_id = new.id
    );
  END IF;

  RETURN new;
END;
$$;