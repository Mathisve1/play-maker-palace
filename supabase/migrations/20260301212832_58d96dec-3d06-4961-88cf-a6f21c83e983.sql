-- Allow reporters to update their own incidents (step 2: add zone, photo, description)
CREATE POLICY "Reporters can update own incidents"
ON public.safety_incidents
FOR UPDATE
USING (auth.uid() = reporter_id)
WITH CHECK (auth.uid() = reporter_id);