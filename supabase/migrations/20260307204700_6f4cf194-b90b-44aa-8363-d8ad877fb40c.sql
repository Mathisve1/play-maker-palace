
-- Delete all related data for FC Harelbeke vs KV Kortrijk (e1a00000-0000-4000-a000-000000000001)

-- 1. Task-related: signups, hour_confirmations, conversations/messages, briefings, signatures, tickets
DELETE FROM public.hour_confirmations WHERE task_id IN (SELECT id FROM public.tasks WHERE event_id = 'e1a00000-0000-4000-a000-000000000001');
DELETE FROM public.messages WHERE conversation_id IN (SELECT id FROM public.conversations WHERE task_id IN (SELECT id FROM public.tasks WHERE event_id = 'e1a00000-0000-4000-a000-000000000001'));
DELETE FROM public.conversations WHERE task_id IN (SELECT id FROM public.tasks WHERE event_id = 'e1a00000-0000-4000-a000-000000000001');
DELETE FROM public.task_signups WHERE task_id IN (SELECT id FROM public.tasks WHERE event_id = 'e1a00000-0000-4000-a000-000000000001');
DELETE FROM public.signature_requests WHERE task_id IN (SELECT id FROM public.tasks WHERE event_id = 'e1a00000-0000-4000-a000-000000000001');
DELETE FROM public.volunteer_tickets WHERE task_id IN (SELECT id FROM public.tasks WHERE event_id = 'e1a00000-0000-4000-a000-000000000001');
DELETE FROM public.sepa_batch_items WHERE task_id IN (SELECT id FROM public.tasks WHERE event_id = 'e1a00000-0000-4000-a000-000000000001');
DELETE FROM public.partner_task_assignments WHERE task_id IN (SELECT id FROM public.tasks WHERE event_id = 'e1a00000-0000-4000-a000-000000000001');

-- 2. Briefings
DELETE FROM public.briefing_checklist_progress WHERE checklist_item_id IN (SELECT bci.id FROM public.briefing_checklist_items bci JOIN public.briefing_blocks bb ON bci.block_id = bb.id JOIN public.briefing_groups bg ON bb.group_id = bg.id JOIN public.briefings b ON bg.briefing_id = b.id WHERE b.task_id IN (SELECT id FROM public.tasks WHERE event_id = 'e1a00000-0000-4000-a000-000000000001'));
DELETE FROM public.briefing_checklist_items WHERE block_id IN (SELECT bb.id FROM public.briefing_blocks bb JOIN public.briefing_groups bg ON bb.group_id = bg.id JOIN public.briefings b ON bg.briefing_id = b.id WHERE b.task_id IN (SELECT id FROM public.tasks WHERE event_id = 'e1a00000-0000-4000-a000-000000000001'));
DELETE FROM public.briefing_route_waypoints WHERE block_id IN (SELECT bb.id FROM public.briefing_blocks bb JOIN public.briefing_groups bg ON bb.group_id = bg.id JOIN public.briefings b ON bg.briefing_id = b.id WHERE b.task_id IN (SELECT id FROM public.tasks WHERE event_id = 'e1a00000-0000-4000-a000-000000000001'));
DELETE FROM public.briefing_block_progress WHERE block_id IN (SELECT bb.id FROM public.briefing_blocks bb JOIN public.briefing_groups bg ON bb.group_id = bg.id JOIN public.briefings b ON bg.briefing_id = b.id WHERE b.task_id IN (SELECT id FROM public.tasks WHERE event_id = 'e1a00000-0000-4000-a000-000000000001'));
DELETE FROM public.briefing_blocks WHERE group_id IN (SELECT bg.id FROM public.briefing_groups bg JOIN public.briefings b ON bg.briefing_id = b.id WHERE b.task_id IN (SELECT id FROM public.tasks WHERE event_id = 'e1a00000-0000-4000-a000-000000000001'));
DELETE FROM public.briefing_group_volunteers WHERE group_id IN (SELECT bg.id FROM public.briefing_groups bg JOIN public.briefings b ON bg.briefing_id = b.id WHERE b.task_id IN (SELECT id FROM public.tasks WHERE event_id = 'e1a00000-0000-4000-a000-000000000001'));
DELETE FROM public.briefing_groups WHERE briefing_id IN (SELECT id FROM public.briefings WHERE task_id IN (SELECT id FROM public.tasks WHERE event_id = 'e1a00000-0000-4000-a000-000000000001'));
DELETE FROM public.briefings WHERE task_id IN (SELECT id FROM public.tasks WHERE event_id = 'e1a00000-0000-4000-a000-000000000001');

-- 3. Safety
DELETE FROM public.safety_checklist_progress WHERE checklist_item_id IN (SELECT id FROM public.safety_checklist_items WHERE event_id = 'e1a00000-0000-4000-a000-000000000001');
DELETE FROM public.safety_checklist_items WHERE event_id = 'e1a00000-0000-4000-a000-000000000001';
DELETE FROM public.safety_incidents WHERE event_id = 'e1a00000-0000-4000-a000-000000000001';
DELETE FROM public.safety_zones WHERE event_id = 'e1a00000-0000-4000-a000-000000000001';

-- 4. Closing tasks
DELETE FROM public.closing_tasks WHERE event_id = 'e1a00000-0000-4000-a000-000000000001';

-- 5. Partner event access
DELETE FROM public.partner_event_signups WHERE partner_event_access_id IN (SELECT id FROM public.partner_event_access WHERE event_id = 'e1a00000-0000-4000-a000-000000000001');
DELETE FROM public.partner_event_access WHERE event_id = 'e1a00000-0000-4000-a000-000000000001';

-- 6. Tasks, groups, event
DELETE FROM public.tasks WHERE event_id = 'e1a00000-0000-4000-a000-000000000001';
DELETE FROM public.event_groups WHERE event_id = 'e1a00000-0000-4000-a000-000000000001';
DELETE FROM public.events WHERE id = 'e1a00000-0000-4000-a000-000000000001';
