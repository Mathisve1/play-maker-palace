-- Migration: volunteer_buddies
-- Bidirectional buddy system for volunteers

CREATE TABLE IF NOT EXISTS public.volunteer_buddies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buddy_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT volunteer_buddies_no_self CHECK (requester_id <> buddy_id),
  CONSTRAINT volunteer_buddies_unique UNIQUE (requester_id, buddy_id)
);

-- Prevent duplicate inverse pairs (A→B and B→A can't both exist)
CREATE UNIQUE INDEX volunteer_buddies_pair_idx
  ON public.volunteer_buddies (LEAST(requester_id, buddy_id), GREATEST(requester_id, buddy_id));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_volunteer_buddies_updated_at
  BEFORE UPDATE ON public.volunteer_buddies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.volunteer_buddies ENABLE ROW LEVEL SECURITY;

-- Both parties can see the row
CREATE POLICY "buddies_select" ON public.volunteer_buddies
  FOR SELECT USING (
    auth.uid() = requester_id OR auth.uid() = buddy_id
  );

-- Only requester can create
CREATE POLICY "buddies_insert" ON public.volunteer_buddies
  FOR INSERT WITH CHECK (
    auth.uid() = requester_id
  );

-- Only the recipient (buddy_id) can accept/decline
CREATE POLICY "buddies_update" ON public.volunteer_buddies
  FOR UPDATE USING (
    auth.uid() = buddy_id
  );

-- Either party can remove the relationship
CREATE POLICY "buddies_delete" ON public.volunteer_buddies
  FOR DELETE USING (
    auth.uid() = requester_id OR auth.uid() = buddy_id
  );
