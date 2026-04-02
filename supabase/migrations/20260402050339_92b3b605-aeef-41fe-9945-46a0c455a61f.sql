
-- Create a SECURITY DEFINER function to retrieve banking info only for authorized club owners/staff
CREATE OR REPLACE FUNCTION public.get_volunteer_banking_info(p_volunteer_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result json;
BEGIN
  -- Verify caller is a club owner or bestuurder/beheerder of a club where this volunteer has signups
  IF NOT EXISTS (
    SELECT 1
    FROM public.task_signups ts
    JOIN public.tasks t ON t.id = ts.task_id
    JOIN public.clubs c ON c.id = t.club_id
    WHERE ts.volunteer_id = p_volunteer_id
      AND (
        c.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.club_members cm
          WHERE cm.club_id = c.id
            AND cm.user_id = auth.uid()
            AND cm.role = ANY(ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
        )
      )
  )
  -- Also allow the volunteer themselves
  AND auth.uid() != p_volunteer_id
  THEN
    RETURN json_build_object('error', 'Unauthorized');
  END IF;

  SELECT json_build_object(
    'bank_iban', p.bank_iban,
    'bank_holder_name', p.bank_holder_name,
    'bank_bic', p.bank_bic,
    'bank_consent_given', p.bank_consent_given,
    'bank_consent_date', p.bank_consent_date
  ) INTO v_result
  FROM public.profiles p
  WHERE p.id = p_volunteer_id;

  RETURN COALESCE(v_result, '{}'::json);
END;
$$;
