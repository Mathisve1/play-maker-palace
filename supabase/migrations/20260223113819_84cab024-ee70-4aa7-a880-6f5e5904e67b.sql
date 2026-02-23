-- Allow club staff to delete sepa_batches (needed for rollback)
CREATE POLICY "Club staff can delete sepa batches"
ON public.sepa_batches
FOR DELETE
USING (has_club_role(auth.uid(), club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role]));

-- Allow club staff to delete sepa_batch_items (needed for rollback)
CREATE POLICY "Club staff can delete batch items"
ON public.sepa_batch_items
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM sepa_batches b
  WHERE b.id = sepa_batch_items.batch_id
  AND has_club_role(auth.uid(), b.club_id, ARRAY['bestuurder'::club_role, 'beheerder'::club_role])
));