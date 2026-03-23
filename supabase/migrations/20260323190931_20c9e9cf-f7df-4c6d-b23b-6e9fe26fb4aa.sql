
-- ════════════════════════════════════════════════════════════════
-- Performance indexes for 1500 concurrent users
-- ════════════════════════════════════════════════════════════════

-- Speed up RLS is_club_member lookups (called on every query)
CREATE INDEX IF NOT EXISTS idx_club_members_user_club ON public.club_members (user_id, club_id);
CREATE INDEX IF NOT EXISTS idx_clubs_owner_id ON public.clubs (owner_id);

-- Speed up club_memberships lookups (used everywhere)
CREATE INDEX IF NOT EXISTS idx_club_memberships_volunteer_club_status ON public.club_memberships (volunteer_id, club_id, status);
CREATE INDEX IF NOT EXISTS idx_club_memberships_club_status ON public.club_memberships (club_id, status);

-- Speed up task queries (most frequent)
CREATE INDEX IF NOT EXISTS idx_tasks_club_status ON public.tasks (club_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_event_id ON public.tasks (event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_date_status ON public.tasks (task_date, status);

-- Speed up task_signups lookups
CREATE INDEX IF NOT EXISTS idx_task_signups_volunteer_status ON public.task_signups (volunteer_id, status);
CREATE INDEX IF NOT EXISTS idx_task_signups_task_status ON public.task_signups (task_id, status);
CREATE INDEX IF NOT EXISTS idx_task_signups_checked_in ON public.task_signups (task_id) WHERE checked_in_at IS NOT NULL;

-- Speed up notifications (realtime + polling)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);

-- Speed up push subscriptions lookups (batch sends)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions (user_id);

-- Speed up volunteer_season_usage (billing trigger)
CREATE INDEX IF NOT EXISTS idx_volunteer_season_usage_club_vol_season ON public.volunteer_season_usage (club_id, volunteer_id, season_id);

-- Speed up events queries
CREATE INDEX IF NOT EXISTS idx_events_club_date ON public.events (club_id, event_date);
CREATE INDEX IF NOT EXISTS idx_events_is_live ON public.events (is_live) WHERE is_live = true;

-- Speed up sponsor coupon lookups
CREATE INDEX IF NOT EXISTS idx_volunteer_coupons_volunteer ON public.volunteer_coupons (volunteer_id, status);
CREATE INDEX IF NOT EXISTS idx_volunteer_coupons_campaign ON public.volunteer_coupons (campaign_id, status);

-- Speed up audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_club_created ON public.audit_logs (club_id, created_at DESC);
