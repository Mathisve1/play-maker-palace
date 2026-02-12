
-- Allow club members to read conversations for tasks in their club
DROP POLICY IF EXISTS "Users can read own conversations" ON public.conversations;
CREATE POLICY "Users can read own conversations"
ON public.conversations
FOR SELECT
USING (
  auth.uid() = volunteer_id 
  OR auth.uid() = club_owner_id
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.club_members cm ON cm.club_id = t.club_id
    WHERE t.id = conversations.task_id AND cm.user_id = auth.uid()
  )
);

-- Allow club members to create conversations (not just volunteers)
DROP POLICY IF EXISTS "Volunteers can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (
  auth.uid() = volunteer_id 
  OR auth.uid() = club_owner_id
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.club_members cm ON cm.club_id = t.club_id
    WHERE t.id = task_id AND cm.user_id = auth.uid()
  )
);

-- Allow club members to send messages in conversations they can access
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
CREATE POLICY "Participants can send messages"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id 
    AND (
      c.volunteer_id = auth.uid() 
      OR c.club_owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.club_members cm ON cm.club_id = t.club_id
        WHERE t.id = c.task_id AND cm.user_id = auth.uid()
      )
    )
  )
);

-- Allow club members to read messages
DROP POLICY IF EXISTS "Participants can read messages" ON public.messages;
CREATE POLICY "Participants can read messages"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id 
    AND (
      c.volunteer_id = auth.uid() 
      OR c.club_owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.club_members cm ON cm.club_id = t.club_id
        WHERE t.id = c.task_id AND cm.user_id = auth.uid()
      )
    )
  )
);

-- Allow club members to mark messages as read
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;
CREATE POLICY "Users can mark messages as read"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id 
    AND (
      c.volunteer_id = auth.uid() 
      OR c.club_owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.club_members cm ON cm.club_id = t.club_id
        WHERE t.id = c.task_id AND cm.user_id = auth.uid()
      )
    )
  )
);

-- Allow conversations to be updated by club members too
CREATE POLICY "Users can update own conversations"
ON public.conversations
FOR UPDATE
USING (
  auth.uid() = volunteer_id 
  OR auth.uid() = club_owner_id
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.club_members cm ON cm.club_id = t.club_id
    WHERE t.id = conversations.task_id AND cm.user_id = auth.uid()
  )
);
