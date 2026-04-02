
-- 1. Fix clubs_safe view to already exclude stripe_account_id (it already does, but let's also add referral_bonus_points and why_volunteer for completeness)
-- The clubs_safe view already excludes stripe_account_id, so no change needed there.

-- 2. Fix chat-attachments storage: restrict SELECT to authenticated users who own the folder
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;
CREATE POLICY "Users can view their own chat attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 3. Fix spoed_bonuses: restrict SELECT to club members only
DROP POLICY IF EXISTS "Authenticated users can read spoed bonuses" ON public.spoed_bonuses;
CREATE POLICY "Club members can read spoed bonuses"
ON public.spoed_bonuses FOR SELECT TO authenticated
USING (is_club_member(auth.uid(), club_id));
