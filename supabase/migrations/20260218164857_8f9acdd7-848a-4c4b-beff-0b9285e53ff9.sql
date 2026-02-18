-- Allow volunteers to delete their own declarations
CREATE POLICY "Volunteers can delete own declarations"
ON public.compliance_declarations
FOR DELETE
USING (auth.uid() = volunteer_id);