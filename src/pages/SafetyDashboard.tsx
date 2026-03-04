import { useEffect, useState, useRef, useCallback, useMemo, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, AlertTriangle, CheckCircle2, Radio, Maximize2, Minimize2,
  Phone, ChevronRight, Clock, MapPin, Volume2, VolumeX, RefreshCw,
  Rocket, Lock, Camera, Image, RotateCcw, Trash2, Play, ToggleLeft, ToggleRight,
  XCircle, Heart, PartyPopper, FileDown, Settings, Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import ClubPageLayout from '@/components/ClubPageLayout';
import SafetyConfigDialog from '@/components/SafetyConfigDialog';
import VolunteerPhoneMockup from '@/components/safety/VolunteerPhoneMockup';
import IncidentMap from '@/components/safety/IncidentMap';
import ClosingProcedureManager from '@/components/safety/ClosingProcedureManager';
import VolunteerClosingView from '@/components/safety/VolunteerClosingView';
import { generateSafetyReportPdf, type SafetyIncidentForPdf, type SafetyZoneForPdf, type ClosingTaskForPdf } from '@/lib/generateSafetyReportPdf';

// Types
interface SafetyZone {
  id: string; name: string; status: string; color: string; event_id: string; club_id: string; checklist_active: boolean;
}
interface SafetyIncidentType {
  id: string; label: string; icon: string; color: string; default_priority: string; club_id: string; emoji: string | null;
}
interface LocationLevel { id: string; club_id: string; name: string; sort_order: number; is_required: boolean; }
interface LocationOption { id: string; level_id: string; label: string; sort_order: number; }
interface SafetyIncident {
  id: string; event_id: string; club_id: string; incident_type_id: string | null;
  zone_id: string | null; reporter_id: string; description: string | null;
  lat: number | null; lng: number | null; status: string; priority: string;
  created_at: string; updated_at: string; resolved_by: string | null; resolved_at: string | null;
  photo_url: string | null;
}
interface ChecklistItem {
  id: string; description: string; zone_id: string | null; event_id: string;
}
interface ChecklistProgress {
  id: string; checklist_item_id: string; volunteer_id: string; is_completed: boolean;
}
interface ReporterProfile {
  id: string; full_name: string | null; avatar_url: string | null;
}
interface TaskZoneInfo {
  id: string; name: string; parent_id: string | null;
}
interface VolunteerZoneAssignment {
  volunteer_id: string; zone_id: string;
}

// ── Alarm sound helper ──
const playAlarm = () => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'square';
    gain.gain.value = 0.3;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.stop(ctx.currentTime + 0.8);
  } catch { /* silent fallback */ }
};

const SafetyDashboard = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { language } = useLanguage();
  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;
  const navigate = useNavigate();

  const [userId, setUserId] = useState<string | null>(null);
  const [clubId, setClubId] = useState<string | null>(null);
  const [userGroupIds, setUserGroupIds] = useState<Set<string>>(new Set());
  const [isStaff, setIsStaff] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [isDemoEvent, setIsDemoEvent] = useState(false);
  const [clubName, setClubName] = useState('');
  const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null);

  const [zones, setZones] = useState<SafetyZone[]>([]);
  const [incidentTypes, setIncidentTypes] = useState<SafetyIncidentType[]>([]);
  const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [checklistProgress, setChecklistProgress] = useState<ChecklistProgress[]>([]);

  const [loading, setLoading] = useState(true);
  const [simLoading, setSimLoading] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [eventClosed, setEventClosed] = useState(false);
  const [closingEvent, setClosingEvent] = useState(false);
  const [flashRed, setFlashRed] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [zoneFullscreen, setZoneFullscreen] = useState(false);
  const [incidentFullscreen, setIncidentFullscreen] = useState(false);
  const zoneRef = useRef<HTMLDivElement>(null);
  const incidentRef = useRef<HTMLDivElement>(null);

  // Steward state - two-step reporting
  const [showIncidentGrid, setShowIncidentGrid] = useState(false);
  const [selectedIncidentType, setSelectedIncidentType] = useState<SafetyIncidentType | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [reporting, setReporting] = useState(false);
  const [incidentPhoto, setIncidentPhoto] = useState<File | null>(null);
  const [locationLevels, setLocationLevels] = useState<LocationLevel[]>([]);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [selectedLocationValues, setSelectedLocationValues] = useState<Record<string, string>>({});

  // Reporter profiles & zone assignments for Control Room
  const [reporterProfiles, setReporterProfiles] = useState<Record<string, ReporterProfile>>({});
  const [volunteerZoneAssignments, setVolunteerZoneAssignments] = useState<VolunteerZoneAssignment[]>([]);
  const [taskZones, setTaskZones] = useState<TaskZoneInfo[]>([]);
  const [highlightedIncidentId, setHighlightedIncidentId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [pendingIncidentId, setPendingIncidentId] = useState<string | null>(null);
  const [step2Mode, setStep2Mode] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [myRole, setMyRole] = useState<{ can_complete_checklist: boolean; can_report_incidents: boolean; can_resolve_incidents: boolean; can_complete_closing: boolean; can_view_team: boolean; level: number; name: string; color: string } | null>(null);
  const [teamIncidents, setTeamIncidents] = useState<SafetyIncident[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; avatar_url: string | null; roleName: string }[]>([]);
  const flashTimeout = useRef<NodeJS.Timeout>();

  const toggleBrowserFullscreen = (ref: React.RefObject<HTMLDivElement | null>, entering: boolean) => {
    if (entering && ref.current) {
      ref.current.requestFullscreen?.().catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) {
        setZoneFullscreen(false);
        setIncidentFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Load data ──
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !eventId) { navigate('/login'); return; }
      setUserId(session.user.id);

      const { data: ev } = await (supabase as any).from('events').select('id, club_id, title, is_live, status').eq('id', eventId).maybeSingle();
      if (!ev) { navigate('/events-manager'); return; }
      setClubId(ev.club_id);
      setEventTitle(ev.title);
      setIsLive(ev.is_live ?? false);
      if (ev.status === 'closed') setEventClosed(true);
      setIsDemoEvent(ev.title?.includes('SIMULATIE') || ev.title?.includes('Harelbeke') || ev.title?.includes('Demo') || false);

      // Fetch club info for thank-you screen
      const { data: clubData } = await supabase.from('clubs').select('name, logo_url').eq('id', ev.club_id).single();
      if (clubData) {
        setClubName(clubData.name);
        setClubLogoUrl(clubData.logo_url);
      }

      const { data: owned } = await supabase.from('clubs').select('id').eq('id', ev.club_id).eq('owner_id', session.user.id);
      const { data: member } = await (supabase as any).from('club_members').select('role').eq('club_id', ev.club_id).eq('user_id', session.user.id).maybeSingle();
      const staff = !!(owned?.length) || ['bestuurder', 'beheerder'].includes(member?.role || '');
      setIsStaff(staff);

      // Fetch user's assigned group IDs for this event
      const { data: userSignups } = await supabase
        .from('task_signups')
        .select('task_id')
        .eq('volunteer_id', session.user.id);
      
      if (userSignups?.length) {
        const uTaskIds = userSignups.map(s => s.task_id);
        const { data: userTasks } = await supabase
          .from('tasks')
          .select('event_group_id')
          .in('id', uTaskIds)
          .eq('event_id', eventId);
        setUserGroupIds(new Set((userTasks || []).map(t => t.event_group_id).filter(Boolean) as string[]));
      }

      const [zRes, itRes, incRes, clRes, cpRes, llRes, loRes] = await Promise.all([
        (supabase as any).from('safety_zones').select('*').eq('event_id', eventId).order('sort_order'),
        (supabase as any).from('safety_incident_types').select('*').eq('club_id', ev.club_id).order('sort_order'),
        (supabase as any).from('safety_incidents').select('*').eq('event_id', eventId).order('created_at', { ascending: false }),
        (supabase as any).from('safety_checklist_items').select('*').eq('event_id', eventId).order('sort_order'),
        (supabase as any).from('safety_checklist_progress').select('*'),
        (supabase as any).from('safety_location_levels').select('*').eq('club_id', ev.club_id).order('sort_order'),
        (supabase as any).from('safety_location_options').select('*').order('sort_order'),
      ]);
      setZones(zRes.data || []);
      setIncidentTypes(itRes.data || []);
      setIncidents(incRes.data || []);
      setChecklistItems(clRes.data || []);
      setChecklistProgress(cpRes.data || []);
      const levels = llRes.data || [];
      setLocationLevels(levels);
      const levelIds = new Set(levels.map((l: any) => l.id));
      setLocationOptions((loRes.data || []).filter((o: any) => levelIds.has(o.level_id)));

      // Fetch reporter profiles for incident cards
      const incidentData = incRes.data || [];
      const reporterIds = [...new Set(incidentData.map((i: any) => i.reporter_id).filter(Boolean))] as string[];
      if (reporterIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', reporterIds);
        const profileMap: Record<string, ReporterProfile> = {};
        (profiles || []).forEach(p => { profileMap[p.id] = p; });
        setReporterProfiles(profileMap);
      }

      // Fetch task zones (hierarchy) for this event's tasks
      const { data: eventTasks } = await (supabase as any).from('tasks').select('id').eq('event_id', eventId);
      const taskIds = (eventTasks || []).map((t: any) => t.id);
      if (taskIds.length > 0) {
        const [tzRes, tzaRes] = await Promise.all([
          (supabase as any).from('task_zones').select('id, name, parent_id').in('task_id', taskIds),
          (supabase as any).from('task_zone_assignments').select('volunteer_id, zone_id').in('zone_id',
            // We need zone IDs first - fetch all
            (await (supabase as any).from('task_zones').select('id').in('task_id', taskIds)).data?.map((z: any) => z.id) || []
          ),
        ]);
        setTaskZones(tzRes.data || []);
        setVolunteerZoneAssignments(tzaRes.data || []);
      }

      // Fetch volunteer's safety role for this event
      if (!staff) {
        const { data: vsrData } = await (supabase as any).from('volunteer_safety_roles')
          .select('safety_role_id').eq('event_id', eventId).eq('volunteer_id', session.user.id).maybeSingle();
        if (vsrData?.safety_role_id) {
          const { data: roleData } = await (supabase as any).from('safety_roles')
            .select('*').eq('id', vsrData.safety_role_id).maybeSingle();
          if (roleData) {
            setMyRole(roleData);
            // If can_view_team, fetch team members (lower level, same event) and their incidents
            if (roleData.can_view_team) {
              const { data: allVsr } = await (supabase as any).from('volunteer_safety_roles')
                .select('volunteer_id, safety_role_id').eq('event_id', eventId);
              if (allVsr) {
                const { data: allRoles } = await (supabase as any).from('safety_roles')
                  .select('id, level, name, color').eq('club_id', ev.club_id);
                const roleMap = new Map((allRoles || []).map((r: any) => [r.id, r as { id: string; level: number; name: string; color: string }]));
                const teamVols = allVsr.filter((v: any) => {
                  if (v.volunteer_id === session.user.id) return false;
                  const vRole = roleMap.get(v.safety_role_id) as { id: string; level: number; name: string; color: string } | undefined;
                  return vRole && vRole.level > roleData.level;
                });
                if (teamVols.length > 0) {
                  const teamIds = teamVols.map((v: any) => v.volunteer_id);
                  const { data: teamProfiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', teamIds);
                  setTeamMembers((teamProfiles || []).map((p: any) => ({
                    id: p.id, name: p.full_name || 'Onbekend', avatar_url: p.avatar_url,
                    roleName: (roleMap.get(teamVols.find((v: any) => v.volunteer_id === p.id)?.safety_role_id) as any)?.name || '',
                  })));
                  // Fetch incidents reported by team members
                  const { data: tIncidents } = await (supabase as any).from('safety_incidents')
                    .select('*').eq('event_id', eventId).in('reporter_id', teamIds).order('created_at', { ascending: false });
                  setTeamIncidents(tIncidents || []);
                }
              }
            }
          }
        }
      }

      setLoading(false);
    };
    init();
  }, [eventId, navigate]);

  // ── Realtime subscriptions ──
  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel(`safety-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'safety_incidents', filter: `event_id=eq.${eventId}` },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const inc = payload.new as SafetyIncident;
            setIncidents(prev => [inc, ...prev]);
            // Fetch reporter profile if not already known
            if (inc.reporter_id) {
              setReporterProfiles(prev => {
                if (prev[inc.reporter_id]) return prev;
                supabase.from('profiles').select('id, full_name, avatar_url').eq('id', inc.reporter_id).single().then(({ data }) => {
                  if (data) setReporterProfiles(p => ({ ...p, [data.id]: data }));
                });
                return prev;
              });
            }
            if (inc.priority === 'high') {
              if (audioEnabled) playAlarm();
              setFlashRed(true);
              if (flashTimeout.current) clearTimeout(flashTimeout.current);
              flashTimeout.current = setTimeout(() => setFlashRed(false), 2000);
            }
          } else if (payload.eventType === 'UPDATE') {
            setIncidents(prev => prev.map(i => i.id === payload.new.id ? payload.new as SafetyIncident : i));
          } else if (payload.eventType === 'DELETE') {
            setIncidents(prev => prev.filter(i => i.id !== payload.old.id));
          }
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'safety_zones', filter: `event_id=eq.${eventId}` },
        (payload: any) => {
          if (payload.eventType === 'UPDATE') {
            setZones(prev => prev.map(z => z.id === payload.new.id ? payload.new as SafetyZone : z));
          }
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'safety_checklist_progress' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setChecklistProgress(prev => [...prev, payload.new as ChecklistProgress]);
          } else if (payload.eventType === 'UPDATE') {
            setChecklistProgress(prev => prev.map(p => p.id === payload.new.id ? payload.new as ChecklistProgress : p));
          }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        (payload: any) => {
          if (payload.new.is_live !== undefined) {
            setIsLive(payload.new.is_live);
          }
          if (payload.new.status === 'closed') {
            setEventClosed(true);
          }
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        () => {
          // Event was deleted (e.g. simulation restart) — navigate volunteer away
          toast.info(t3('Event is beëindigd of herstart.', 'L\'événement est terminé ou redémarré.', 'Event has ended or restarted.'));
          navigate('/volunteer');
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId, audioEnabled]);

  // ── Steward: toggle checklist ──
  const handleToggleChecklist = async (itemId: string) => {
    if (!userId) return;
    const existing = checklistProgress.find(p => p.checklist_item_id === itemId && p.volunteer_id === userId);
    if (existing) {
      const newVal = !existing.is_completed;
      await (supabase as any).from('safety_checklist_progress').update({
        is_completed: newVal, completed_at: newVal ? new Date().toISOString() : null,
      }).eq('id', existing.id);
      setChecklistProgress(prev => prev.map(p => p.id === existing.id ? { ...p, is_completed: newVal } : p));
    } else {
      const { data } = await (supabase as any).from('safety_checklist_progress').insert({
        checklist_item_id: itemId, volunteer_id: userId, is_completed: true, completed_at: new Date().toISOString(),
      }).select('*').maybeSingle();
      if (data) setChecklistProgress(prev => [...prev, data]);
    }
  };

  // ── Photo handling ──
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIncidentPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!incidentPhoto || !userId) return null;
    const ext = incidentPhoto.name.split('.').pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('incident-photos').upload(path, incidentPhoto);
    if (error) { console.error('Photo upload failed:', error); return null; }
    const { data: { publicUrl } } = supabase.storage.from('incident-photos').getPublicUrl(path);
    return publicUrl;
  };

  // ── Steward: Step 1 — instant report (type + GPS) ──
  const handleInstantReport = async (type: SafetyIncidentType) => {
    if (!eventId || !clubId || !userId) return;
    setSelectedIncidentType(type);
    setReporting(true);

    let lat: number | null = null, lng: number | null = null;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
      lat = pos.coords.latitude; lng = pos.coords.longitude;
    } catch {
      toast.error(t3('GPS-locatie is vereist om een incident te melden. Sta locatietoegang toe.', 'La localisation GPS est requise pour signaler un incident.', 'GPS location is required to report an incident.'));
      setReporting(false);
      return;
    }

    // Auto-assign zone if volunteer has exactly one assigned zone
    const myZoneArray = Array.from(myZoneIds);
    const autoZoneId = myZoneArray.length === 1 ? myZoneArray[0] : (myZoneArray.length > 0 ? myZoneArray[0] : null);

    const { data: inc, error } = await (supabase as any).from('safety_incidents').insert({
      event_id: eventId, club_id: clubId, incident_type_id: type.id,
      reporter_id: userId, priority: type.default_priority, status: 'nieuw',
      lat, lng,
      zone_id: autoZoneId,
    }).select('id').single();

    if (error) { toast.error(error.message); setReporting(false); return; }

    if (autoZoneId) setSelectedZoneId(autoZoneId);
    setPendingIncidentId(inc.id);
    setStep2Mode(true);
    setShowIncidentGrid(false);
    toast.success(t3('⚡ Melding direct verstuurd met GPS!', '⚡ Signalement envoyé avec GPS !', '⚡ Report sent instantly with GPS!'));
    setReporting(false);
  };

  // ── Steward: Step 2 — update with details ──
  const handleUpdateReport = async () => {
    if (!pendingIncidentId) return;
    setReporting(true);

    const photo_url = await uploadPhoto();
    const updates: any = {};
    if (incidentDesc.trim()) updates.description = incidentDesc.trim();
    if (selectedZoneId) updates.zone_id = selectedZoneId;
    if (photo_url) updates.photo_url = photo_url;
    // Add location data if any levels were filled
    const locData = Object.entries(selectedLocationValues).filter(([, v]) => v);
    if (locData.length > 0) {
      const locationData = locData.map(([levelId, optionId]) => {
        const level = locationLevels.find(l => l.id === levelId);
        const option = locationOptions.find(o => o.id === optionId);
        return { level_id: levelId, level_name: level?.name || '', option_id: optionId, option_label: option?.label || '' };
      });
      updates.location_data = locationData;
    }

    if (Object.keys(updates).length > 0) {
      await (supabase as any).from('safety_incidents').update(updates).eq('id', pendingIncidentId);
    }

    toast.success(t3('Details toegevoegd aan melding', 'Détails ajoutés au signalement', 'Details added to report'));
    resetReportFlow();
    setReporting(false);
  };

  const resetReportFlow = () => {
    setShowIncidentGrid(false);
    setSelectedIncidentType(null);
    setSelectedZoneId('');
    setIncidentDesc('');
    setIncidentPhoto(null);
    setPhotoPreview(null);
    setPendingIncidentId(null);
    setStep2Mode(false);
    setSelectedLocationValues({});
  };

  // ── Control room: update incident ──
  const handleUpdateIncident = async (incidentId: string, status: string) => {
    await (supabase as any).from('safety_incidents').update({
      status, updated_at: new Date().toISOString(),
      ...(status === 'opgelost' ? { resolved_by: userId, resolved_at: new Date().toISOString() } : {}),
    }).eq('id', incidentId);
  };

  // ── GO LIVE ──
  const handleGoLive = async () => {
    if (!eventId) return;
    await (supabase as any).from('events').update({ is_live: true }).eq('id', eventId);
    setIsLive(true);
    toast.success(t3('🚀 Event is LIVE! Vrijwilligers kunnen nu incidenten melden.', '🚀 L\'événement est EN DIRECT ! Les bénévoles peuvent signaler.', '🚀 Event is LIVE! Volunteers can now report incidents.'));
  };

  // ── CLOSE EVENT ──
  const handleCloseEvent = async () => {
    if (!eventId) return;
    setClosingEvent(true);
    const { error } = await (supabase as any).from('events').update({ is_live: false, status: 'closed' }).eq('id', eventId);
    if (error) {
      toast.error(error.message);
    } else {
      setIsLive(false);
      setEventClosed(true);
      toast.success(t3('Event is afgesloten. Alle vrijwilligers worden doorgestuurd.', 'Événement clôturé. Tous les bénévoles sont redirigés.', 'Event closed. All volunteers are being redirected.'));
    }
    setClosingEvent(false);
    setShowCloseConfirm(false);
  };

  // ── GENERATE SAFETY REPORT PDF ──
  const handleDownloadReport = async () => {
    if (!clubId || !eventId) return;
    setGeneratingReport(true);
    try {
      // Fetch club name
      const { data: club } = await supabase.from('clubs').select('name').eq('id', clubId).single();
      // Fetch event date
      const { data: ev } = await (supabase as any).from('events').select('event_date').eq('id', eventId).single();
      // Fetch user name
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId!).single();
      // Fetch closing tasks with volunteer names
      const { data: cTasks } = await (supabase as any).from('closing_tasks').select('*').eq('event_id', eventId).order('sort_order');
      const volIds = [...new Set((cTasks || []).map((t: any) => t.assigned_volunteer_id).filter(Boolean))] as string[];
      let volMap: Record<string, string> = {};
      if (volIds.length > 0) {
        const { data: vols } = await supabase.from('profiles').select('id, full_name').in('id', volIds);
        (vols || []).forEach(v => { volMap[v.id] = v.full_name || 'Onbekend'; });
      }

      const pdfZones: SafetyZoneForPdf[] = zones.map(z => {
        const prog = zoneProgress[z.id];
        return { name: z.name, color: z.color, checklist_total: prog?.total || 0, checklist_done: prog?.done || 0 };
      });

      const pdfIncidents: SafetyIncidentForPdf[] = incidents.map(inc => ({
        id: inc.id,
        incident_type_label: getIncidentTypeName(inc.incident_type_id),
        incident_type_color: incidentTypes.find(t => t.id === inc.incident_type_id)?.color || '#888',
        zone_name: getZoneName(inc.zone_id),
        description: inc.description,
        priority: inc.priority,
        status: inc.status,
        created_at: inc.created_at,
        resolved_at: inc.resolved_at,
        photo_url: inc.photo_url,
      }));

      const pdfClosingTasks: ClosingTaskForPdf[] = (cTasks || []).map((t: any) => ({
        description: t.description,
        status: t.status,
        assigned_volunteer: t.assigned_volunteer_id ? volMap[t.assigned_volunteer_id] || null : null,
        requires_photo: t.requires_photo,
        requires_note: t.requires_note,
        photo_url: t.photo_url,
        note: t.note,
        completed_at: t.completed_at,
      }));

      const doc = generateSafetyReportPdf({
        eventTitle,
        eventDate: ev?.event_date || null,
        clubName: club?.name || t3('Onbekend', 'Inconnu', 'Unknown'),
        generatedBy: profile?.full_name || t3('Onbekend', 'Inconnu', 'Unknown'),
        zones: pdfZones,
        incidents: pdfIncidents,
        closingTasks: pdfClosingTasks,
        totalChecklistItems,
        totalChecklistDone,
        language,
      });

      doc.save(`${t3('veiligheidsrapport', 'rapport-securite', 'safety-report')}-${eventTitle.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      toast.success(t3('Veiligheidsrapport gedownload!', 'Rapport de sécurité téléchargé !', 'Safety report downloaded!'));
    } catch (err: any) {
      toast.error(err.message || t3('Fout bij rapport generatie', 'Erreur lors de la génération', 'Error generating report'));
    } finally {
      setGeneratingReport(false);
    }
  };

  // ── Toggle zone checklist activation ──
  const handleToggleZoneActive = async (zoneId: string, currentValue: boolean) => {
    const newValue = !currentValue;
    // Optimistic update
    setZones(prev => prev.map(z => z.id === zoneId ? { ...z, checklist_active: newValue } : z));
    const { error } = await (supabase as any).from('safety_zones').update({ checklist_active: newValue }).eq('id', zoneId);
    if (error) {
      toast.error(error.message);
      setZones(prev => prev.map(z => z.id === zoneId ? { ...z, checklist_active: currentValue } : z));
    } else {
      toast.success(newValue ? `✅ Zone "${zones.find(z => z.id === zoneId)?.name}" geactiveerd` : `Zone "${zones.find(z => z.id === zoneId)?.name}" gedeactiveerd`);
    }
  };

  // ── Simulation controls ──
  // (simLoading state is declared at top level)

  const handleResetSimulation = async () => {
    if (!clubId) return;
    setSimLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await supabase.functions.invoke('simulate-event', {
        body: { club_id: clubId, action: 'delete' },
      });
      if (res.error) throw res.error;
      toast.success(t3('Simulatie data verwijderd!', 'Données de simulation supprimées !', 'Simulation data deleted!'));
      navigate('/events-manager');
    } catch (err: any) {
      toast.error(err.message || t3('Fout bij verwijderen', 'Erreur lors de la suppression', 'Error deleting'));
    } finally {
      setSimLoading(false);
    }
  };

  const handleRestartSimulation = async () => {
    if (!clubId) return;
    setSimLoading(true);
    try {
      // First delete
      await supabase.functions.invoke('simulate-event', {
        body: { club_id: clubId, action: 'delete' },
      });
      // Then create new
      const res = await supabase.functions.invoke('simulate-event', {
        body: { club_id: clubId },
      });
      if (res.error) throw res.error;
      const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      if (data.event_id) {
        toast.success(t3('Simulatie herstart! Navigeren naar nieuw event...', 'Simulation redémarrée ! Navigation vers le nouvel événement...', 'Simulation restarted! Navigating to new event...'));
        navigate(`/safety/${data.event_id}`);
      }
    } catch (err: any) {
      toast.error(err.message || t3('Fout bij herstarten', 'Erreur lors du redémarrage', 'Error restarting'));
    } finally {
      setSimLoading(false);
    }
  };

  // ── Computed values ──
  // Filter zones/items for volunteer view based on assigned groups
  const myZones = useMemo(() => {
    if (isStaff) return zones;
    // Volunteers only see zones linked to their assigned groups (or unlinked zones)
    return zones.filter((z: any) => !z.event_group_id || userGroupIds.has(z.event_group_id));
  }, [zones, userGroupIds, isStaff]);
  
  const myZoneIds = useMemo(() => new Set(myZones.map(z => z.id)), [myZones]);
  
  const myChecklistItems = useMemo(() => {
    if (isStaff) return checklistItems;
    // Volunteers only see items in their assigned zones (never zone-less items for safety)
    if (userGroupIds.size === 0) return [];
    return checklistItems.filter(i => i.zone_id && myZoneIds.has(i.zone_id));
  }, [checklistItems, myZoneIds, isStaff, userGroupIds]);

  const isItemCompleted = (itemId: string) => checklistProgress.some(p => p.checklist_item_id === itemId && p.is_completed);
  const activeIncidents = useMemo(() => incidents.filter(i => i.status !== 'opgelost'), [incidents]);
  const highPriorityCount = activeIncidents.filter(i => i.priority === 'high').length;

  const getIncidentTypeName = (typeId: string | null) => incidentTypes.find(t => t.id === typeId)?.label || t3('Onbekend', 'Inconnu', 'Unknown');
  const getZoneName = (zoneId: string | null) => zones.find(z => z.id === zoneId)?.name || '—';

  // Build full zone hierarchy path for a volunteer (e.g. "Hoofdtribune > Rij A > Stoel 12")
  const getVolunteerZonePath = useCallback((volunteerId: string): string | null => {
    const assignments = volunteerZoneAssignments.filter(a => a.volunteer_id === volunteerId);
    if (assignments.length === 0) return null;
    
    // Build path for the deepest assigned zone
    const buildPath = (zoneId: string): string[] => {
      const zone = taskZones.find(z => z.id === zoneId);
      if (!zone) return [];
      if (zone.parent_id) {
        return [...buildPath(zone.parent_id), zone.name];
      }
      return [zone.name];
    };

    // Find the deepest zone (most parents)
    let deepestPath: string[] = [];
    for (const a of assignments) {
      const path = buildPath(a.zone_id);
      if (path.length > deepestPath.length) deepestPath = path;
    }
    return deepestPath.length > 0 ? deepestPath.join(' › ') : null;
  }, [volunteerZoneAssignments, taskZones]);

  const getReporterInfo = useCallback((reporterId: string) => reporterProfiles[reporterId] || null, [reporterProfiles]);

  const priorityColor = (p: string) => p === 'high' ? 'bg-destructive/20 text-destructive border-destructive/30' : p === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  const statusColor = (s: string) => s === 'nieuw' ? 'bg-destructive' : s === 'bezig' ? 'bg-amber-500' : 'bg-emerald-500';

  // Zone checklist progress
  const zoneProgress = useMemo(() => {
    const map: Record<string, { total: number; done: number }> = {};
    zones.forEach(z => { map[z.id] = { total: 0, done: 0 }; });
    map['__general'] = { total: 0, done: 0 };
    checklistItems.forEach(item => {
      const key = item.zone_id || '__general';
      if (!map[key]) map[key] = { total: 0, done: 0 };
      map[key].total++;
      if (isItemCompleted(item.id)) map[key].done++;
    });
    return map;
  }, [zones, checklistItems, checklistProgress]);

  // For staff: use all items. For volunteers: use filtered items.
  const volChecklistDone = myChecklistItems.filter(i => isItemCompleted(i.id)).length;
  const volChecklistTotal = myChecklistItems.length;
  // Staff always sees all items for GO LIVE decision
  const totalChecklistDone = checklistItems.filter(i => isItemCompleted(i.id)).length;
  const totalChecklistItems = checklistItems.length;
  const allChecklistComplete = totalChecklistItems > 0 && totalChecklistDone === totalChecklistItems;

  const zoneHasActiveIncident = useCallback((zoneId: string) => {
    return activeIncidents.some(i => i.zone_id === zoneId);
  }, [activeIncidents]);

  // Incidents without a zone assigned
  const unzonedActiveIncidents = useMemo(() => activeIncidents.filter(i => !i.zone_id), [activeIncidents]);

  // Auto-redirect volunteers after event closes (only if no closing tasks assigned)
  const [hasClosingTasks, setHasClosingTasks] = useState(false);
  useEffect(() => {
    if (!eventClosed || !userId) return;
    (supabase as any).from('closing_tasks').select('id').eq('event_id', eventId).eq('assigned_volunteer_id', userId).limit(1).then(({ data }: any) => {
      setHasClosingTasks((data?.length || 0) > 0);
    });
  }, [eventClosed, userId, eventId]);

  // No more auto-redirect — volunteer clicks OK to go back

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━
  // VOLUNTEER: Thank-you screen after event closes
  // ━━━━━━━━━━━━━━━━━━━━━━
  if (!isStaff && eventClosed) {
    return (
      <div className="min-h-screen bg-background p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className="max-w-md mx-auto space-y-6 pt-8"
        >
          <div className="text-center space-y-4">
            {/* Club logo */}
            {clubLogoUrl && (
              <motion.img
                src={clubLogoUrl}
                alt={clubName}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring' }}
                className="w-20 h-20 rounded-2xl object-contain mx-auto border border-border shadow-md bg-card"
              />
            )}

            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <PartyPopper className="w-12 h-12 mx-auto text-primary mb-1" />
            </motion.div>

            <h1 className="text-3xl font-heading font-bold text-foreground">{t3('Bedankt!', 'Merci !', 'Thank you!')}</h1>

            {clubName && (
              <p className="text-lg font-semibold text-foreground">{clubName}</p>
            )}

            <p className="text-muted-foreground text-base mt-1">
              {t3(
                `Het evenement ${eventTitle} is afgelopen.`,
                `L'événement ${eventTitle} est terminé.`,
                `The event ${eventTitle} has ended.`
              )}
            </p>

            <p className="text-muted-foreground text-sm">
              {t3('Hartelijk dank voor je geweldige inzet als vrijwilliger. Jouw hulp maakt het verschil! 💪', 'Merci pour votre engagement en tant que bénévole. Votre aide fait la différence ! 💪', 'Thank you for your amazing effort as a volunteer. Your help makes the difference! 💪')}
            </p>
          </div>

          {/* Closing tasks for this volunteer */}
          {userId && (
            <VolunteerClosingView
              eventId={eventId || ''}
              userId={userId}
              eventTitle={eventTitle}
            />
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              onClick={() => navigate('/dashboard')}
              className="w-full h-12 rounded-xl text-base font-semibold gap-2"
            >
              <Heart className="w-5 h-5" /> {t3('Oké, terug naar dashboard', 'OK, retour au tableau de bord', 'OK, back to dashboard')}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━
  // VOLUNTEER VIEW - After GO LIVE: Incident-only mode
  // ━━━━━━━━━━━━━━━━━━━━━━
  if (!isStaff && isLive) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-destructive" />
            <span className="font-heading font-bold text-foreground truncate">{eventTitle}</span>
          </div>
          <Badge variant="destructive" className="text-xs gap-1">
            <Radio className="w-3 h-3 animate-pulse" /> LIVE
          </Badge>
        </header>

        <div className="p-4 pb-32 space-y-4">
          {myRole && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: myRole.color }} />
              <span className="text-sm font-medium text-foreground">{myRole.name}</span>
              <Badge variant="outline" className="text-[10px] ml-auto">{t3('Niv.', 'Niv.', 'Lvl.')} {myRole.level}</Badge>
            </div>
          )}

          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-center">
            <Lock className="w-6 h-6 text-destructive mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">{t3('Event is live', 'L\'événement est en direct', 'Event is live')}{myRole && !myRole.can_report_incidents ? '' : t3(' — Meld incidenten hieronder', ' — Signalez les incidents ci-dessous', ' — Report incidents below')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {myRole && !myRole.can_report_incidents ? t3('Je hebt geen rechten om incidenten te melden.', 'Vous n\'avez pas les droits pour signaler.', 'You don\'t have permission to report incidents.') : t3('Andere functies zijn vergrendeld tijdens het evenement.', 'Les autres fonctions sont verrouillées.', 'Other features are locked during the event.')}
            </p>
          </div>

          {/* Team overview for higher-ranked volunteers */}
          {myRole?.can_view_team && teamMembers.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" /> {t3('Mijn Team', 'Mon Équipe', 'My Team')} ({teamMembers.length})
                </h3>
              </div>
              <div className="p-3 space-y-3">
                {teamMembers.map(member => {
                  const memberIncidents = teamIncidents.filter(i => i.reporter_id === member.id);
                  return (
                    <div key={member.id} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {member.avatar_url ? <img src={member.avatar_url} className="w-7 h-7 rounded-full object-cover" /> : member.name[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-foreground flex-1">{member.name}</span>
                        <Badge variant="outline" className="text-[10px]">{member.roleName}</Badge>
                      </div>
                      {memberIncidents.length > 0 ? (
                        <div className="pl-9 space-y-1">
                          {memberIncidents.slice(0, 3).map(inc => (
                            <div key={inc.id} className="flex items-center gap-2 text-xs">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor(inc.status)}`} />
                              <span className="text-foreground">{getIncidentTypeName(inc.incident_type_id)}</span>
                              <span className="text-muted-foreground">· {getZoneName(inc.zone_id)}</span>
                              <span className="text-muted-foreground ml-auto">{new Date(inc.created_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="pl-9 text-[11px] text-muted-foreground">{t3('Geen meldingen', 'Aucun signalement', 'No reports')}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Floating incident button — TWO-STEP (only if role allows or no role assigned) */}
        {(!myRole || myRole.can_report_incidents) && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-50">
          <AnimatePresence mode="wait">
            {!showIncidentGrid && !step2Mode && (
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
                <Button
                  onClick={() => setShowIncidentGrid(true)}
                  className="w-full h-14 rounded-2xl bg-destructive text-destructive-foreground shadow-lg text-base font-bold gap-2"
                >
                  <AlertTriangle className="w-5 h-5" /> {t3('Incident melden', 'Signaler un incident', 'Report incident')}
                </Button>
              </motion.div>
            )}

            {showIncidentGrid && !step2Mode && (
              <motion.div
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                className="bg-card rounded-2xl border border-border shadow-2xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-bold text-foreground">{t3('Tik = direct melden!', 'Appuyez = signaler !', 'Tap = instant report!')}</h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowIncidentGrid(false)}><Minimize2 className="w-4 h-4" /></Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {incidentTypes.map(type => (
                    <button
                      key={type.id}
                      disabled={reporting}
                      onClick={() => handleInstantReport(type)}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-destructive/50 bg-background transition-all active:scale-95 min-h-[80px]"
                    >
                      {type.emoji ? (
                        <span className="text-2xl">{type.emoji}</span>
                      ) : (
                        <AlertTriangle className="w-6 h-6" style={{ color: type.color }} />
                      )}
                      <span className="text-xs font-medium text-foreground text-center leading-tight">{type.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-2">{t3('GPS wordt automatisch meegestuurd bij klik', 'GPS envoyé automatiquement', 'GPS sent automatically on click')}</p>
              </motion.div>
            )}

            {step2Mode && selectedIncidentType && (
              <motion.div
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                className="bg-card rounded-2xl border border-border shadow-2xl p-4 space-y-3"
              >
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2 text-center">
                  <p className="text-xs font-semibold text-emerald-600">✓ {t3('Melding verstuurd met GPS!', 'Signalement envoyé avec GPS !', 'Report sent with GPS!')}</p>
                  <p className="text-[10px] text-muted-foreground">{t3('Voeg hieronder extra details toe', 'Ajoutez des détails ci-dessous', 'Add extra details below')}</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedIncidentType.emoji ? (
                    <span className="text-xl">{selectedIncidentType.emoji}</span>
                  ) : (
                    <AlertTriangle className="w-5 h-5" style={{ color: selectedIncidentType.color }} />
                  )}
                  <span className="font-heading font-bold text-foreground">{selectedIncidentType.label}</span>
                </div>
                {zones.length > 0 && (
                  <select value={selectedZoneId} onChange={e => setSelectedZoneId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm">
                    <option value="">{t3('Zone (optioneel)', 'Zone (optionnel)', 'Zone (optional)')}</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                )}
                {/* Location level dropdowns */}
                {locationLevels.length > 0 && (
                  <div className="space-y-2">
                    {locationLevels.map(level => {
                      const opts = locationOptions.filter(o => o.level_id === level.id);
                      if (opts.length === 0) return null;
                      return (
                        <select
                          key={level.id}
                          value={selectedLocationValues[level.id] || ''}
                          onChange={e => setSelectedLocationValues(prev => ({ ...prev, [level.id]: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm"
                        >
                          <option value="">{level.name} {level.is_required ? '*' : t3('(optioneel)', '(optionnel)', '(optional)')}</option>
                          {opts.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                      );
                    })}
                  </div>
                )}
                <input type="text" placeholder={t3('Korte beschrijving (optioneel)', 'Description courte (optionnel)', 'Short description (optional)')} value={incidentDesc} onChange={e => setIncidentDesc(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm" />

                {/* Photo upload */}
                <div>
                  {photoPreview ? (
                    <div className="relative">
                      <img src={photoPreview} alt="Preview" className="w-full h-32 object-cover rounded-xl border border-border" />
                      <Button variant="destructive" size="icon" className="absolute top-1 right-1 w-6 h-6" onClick={() => { setIncidentPhoto(null); setPhotoPreview(null); }}>×</Button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-border bg-muted/30 cursor-pointer hover:border-primary/50 transition-colors">
                      <Camera className="w-5 h-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{t3('Foto toevoegen (optioneel)', 'Ajouter une photo (optionnel)', 'Add photo (optional)')}</span>
                      <input type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} className="hidden" />
                    </label>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetReportFlow} className="flex-1 h-12 rounded-xl text-sm">
                    {t3('Overslaan', 'Passer', 'Skip')}
                  </Button>
                  <Button onClick={handleUpdateReport} disabled={reporting} className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm">
                    {reporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : t3('Details toevoegen', 'Ajouter les détails', 'Add details')}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━
  // VOLUNTEER VIEW - Before GO LIVE: Checklist mode
  // ━━━━━━━━━━━━━━━━━━━━━━
  if (!isStaff) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-heading font-bold text-foreground truncate">{eventTitle}</span>
          </div>
          <Badge variant="outline" className="text-xs">{volChecklistDone}/{volChecklistTotal}</Badge>
        </header>

        <div className="p-4 pb-32 space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t3('Voortgang', 'Progression', 'Progress')}</span>
              <span className="font-semibold text-foreground">{volChecklistTotal > 0 ? Math.round((volChecklistDone / volChecklistTotal) * 100) : 0}%</span>
            </div>
            <Progress value={volChecklistTotal > 0 ? (volChecklistDone / volChecklistTotal) * 100 : 0} className="h-3" />
          </div>

          {/* Items grouped by zone — only user's assigned zones */}
          {myZones.map(zone => {
            const items = myChecklistItems.filter(ci => ci.zone_id === zone.id);
            if (items.length === 0) return null;
            const prog = zoneProgress[zone.id];
            const pct = prog ? Math.round((prog.done / prog.total) * 100) : 0;
            const isActive = (zone as any).checklist_active;
            return (
              <div key={zone.id}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-heading font-semibold text-foreground flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }} />
                    {zone.name}
                  </h3>
                  {isActive ? (
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                  ) : (
                     <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                       <Lock className="w-3 h-3" /> {t3('Wacht op activatie', 'En attente d\'activation', 'Waiting for activation')}
                    </Badge>
                  )}
                </div>
                {isActive ? (
                  <div className="space-y-1.5">
                    {items.map(item => {
                      const done = isItemCompleted(item.id);
                      return (
                        <motion.button
                          key={item.id}
                          layout
                          onClick={() => handleToggleChecklist(item.id)}
                          className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${done ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' : 'bg-card border-border hover:border-primary/30'}`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${done ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground/40'}`}>
                            {done && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <span className={`text-sm ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {item.description}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1.5 opacity-50 pointer-events-none">
                    {items.map(item => (
                      <div
                        key={item.id}
                        className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border bg-muted/30"
                      >
                        <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/20 shrink-0" />
                        <span className="text-sm text-muted-foreground">{item.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {myChecklistItems.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-6">{t3('Geen checklist items voor jouw toegewezen zones.', 'Aucun élément de checklist pour vos zones.', 'No checklist items for your assigned zones.')}</p>
          )}
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━
  // CONTROL ROOM (Staff view)
  // ━━━━━━━━━━━━━━━━━━━━━━
  return (
    <ClubPageLayout>
      <div className={`relative min-h-screen transition-colors ${flashRed ? 'animate-pulse' : ''}`}>
        {/* Flash overlay */}
        <AnimatePresence>
          {flashRed && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-destructive z-50 pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" /> Control Room
            </h1>
            <p className="text-muted-foreground mt-1">{eventTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {isLive && (
              <Badge variant="destructive" className="gap-1">
                <Radio className="w-3 h-3 animate-pulse" /> LIVE
              </Badge>
            )}
            {!isLive && (
              <Badge variant="secondary">Pre-event</Badge>
            )}
            {isLive && (
              <Badge variant={highPriorityCount > 0 ? 'destructive' : 'secondary'}>
                {activeIncidents.length} {t3('actief', 'actifs', 'active')}{highPriorityCount > 0 && ` · ${highPriorityCount} ${t3('hoog', 'élevé', 'high')}`}
              </Badge>
            )}
            {isLive && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setShowCloseConfirm(true)}
              >
                <XCircle className="w-3.5 h-3.5" /> {t3('Sluit Event', 'Clôturer', 'Close Event')}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setAudioEnabled(!audioEnabled)}>
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowConfig(true)} className="gap-1.5">
              <Settings className="w-3.5 h-3.5" /> {t3('Configuratie', 'Configuration', 'Configuration')}
            </Button>
            {isDemoEvent && (
              <>
                 <Button variant="outline" size="sm" onClick={handleRestartSimulation} disabled={simLoading} className="gap-1.5">
                   <RotateCcw className="w-3.5 h-3.5" /> {t3('Herstart', 'Redémarrer', 'Restart')}
                 </Button>
                 <Button variant="ghost" size="sm" onClick={handleResetSimulation} disabled={simLoading} className="gap-1.5 text-destructive hover:text-destructive">
                   <Trash2 className="w-3.5 h-3.5" /> {t3('Verwijder', 'Supprimer', 'Delete')}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* PRE-EVENT: Checklist progress + GO LIVE */}
        {!isLive && (
          <div className="mb-6 space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" /> {t3('Pre-event Checklist Voortgang', 'Progression Checklist Pré-événement', 'Pre-event Checklist Progress')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Overall */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t3('Totaal', 'Total', 'Total')}</span>
                    <span className="font-semibold text-foreground">{totalChecklistDone}/{totalChecklistItems} ({totalChecklistItems > 0 ? Math.round((totalChecklistDone / totalChecklistItems) * 100) : 0}%)</span>
                  </div>
                  <Progress value={totalChecklistItems > 0 ? (totalChecklistDone / totalChecklistItems) * 100 : 0} className="h-3" />
                </div>

                {/* Per-zone with items always visible */}
                <div className="space-y-4">
                  {zones.map(zone => {
                    const prog = zoneProgress[zone.id];
                    if (!prog || prog.total === 0) return null;
                    const pct = Math.round((prog.done / prog.total) * 100);
                    const zoneItems = checklistItems.filter(ci => ci.zone_id === zone.id);
                    return (
                      <div key={zone.id} className={`rounded-xl border-2 p-4 transition-all ${pct === 100 ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border bg-card'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }} />
                            {zone.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-medium">{prog.done}/{prog.total} — {pct}%</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 px-2 gap-1 text-xs ${(zone as any).checklist_active ? 'text-emerald-500' : 'text-muted-foreground'}`}
                              onClick={() => handleToggleZoneActive(zone.id, (zone as any).checklist_active)}
                            >
                               {(zone as any).checklist_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                               {(zone as any).checklist_active ? t3('Actief', 'Actif', 'Active') : t3('Uit', 'Désactivé', 'Off')}
                            </Button>
                          </div>
                        </div>
                        <Progress value={pct} className="h-2 mb-3" />
                        {/* Individual items — club can also check them */}
                        <div className="space-y-1">
                          {zoneItems.map(ci => (
                            <button
                              key={ci.id}
                              onClick={() => handleToggleChecklist(ci.id)}
                              className="flex items-center gap-2 text-xs py-1 w-full text-left hover:bg-muted/50 rounded px-1 transition-colors"
                            >
                              {isItemCompleted(ci.id)
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                : <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 shrink-0" />
                              }
                              <span className={isItemCompleted(ci.id) ? 'text-muted-foreground line-through' : 'text-foreground'}>{ci.description}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* GO LIVE */}
                {allChecklistComplete ? (
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <Button onClick={handleGoLive} className="w-full h-14 text-lg font-bold gap-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg">
                      <Rocket className="w-6 h-6" /> GO LIVE
                    </Button>
                  </motion.div>
                ) : (
                   <div className="bg-muted/50 rounded-xl p-4 text-center">
                     <p className="text-sm text-muted-foreground">{t3('Alle checklist items moeten afgevinkt zijn voordat je live kunt gaan.', 'Tous les éléments doivent être cochés avant de passer en direct.', 'All checklist items must be completed before going live.')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Closing Procedure moved to /safety/:eventId/closing */}

        {/* Safety Report moved to /safety/:eventId hub page */}

        {/* Main content: Control Room + optional Phone Mockup */}
        <div className={`grid gap-6 ${isDemoEvent ? 'grid-cols-1 xl:grid-cols-[1fr_1fr_320px]' : 'grid-cols-1 lg:grid-cols-3'}`}>
          {/* Zone Monitor */}
          <div ref={zoneRef} className={`${incidentFullscreen ? 'hidden' : zoneFullscreen ? 'col-span-full' : isDemoEvent ? 'xl:col-span-1' : 'lg:col-span-2'} ${zoneFullscreen ? 'bg-background h-screen flex flex-col' : ''}`}>
            <Card className={`bg-card border-border ${zoneFullscreen ? 'flex-1 flex flex-col border-0 rounded-none' : ''}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-3 shrink-0">
                 <CardTitle className="text-lg font-heading flex items-center gap-2">
                   <Radio className="w-5 h-5 text-primary" /> {t3('Sectie Monitor', 'Moniteur de Sections', 'Section Monitor')}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { const next = !zoneFullscreen; setZoneFullscreen(next); setIncidentFullscreen(false); toggleBrowserFullscreen(zoneRef, next); }}>
                  {zoneFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </CardHeader>
              <CardContent className={zoneFullscreen ? 'flex-1 overflow-auto' : ''}>
                <div className={`grid gap-3 ${zoneFullscreen ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-fr h-full' : 'grid-cols-2 md:grid-cols-3'}`} style={zoneFullscreen ? { minHeight: 'calc(100vh - 80px)' } : undefined}>
                  {zones.map(zone => {
                    const hasIncident = zoneHasActiveIncident(zone.id);
                    const zoneIncidents = activeIncidents.filter(i => i.zone_id === zone.id);
                    const prog = zoneProgress[zone.id];
                    const pct = prog && prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : null;

                    return (
                      <motion.div
                        key={zone.id}
                        animate={{ backgroundColor: hasIncident ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.02)' }}
                        transition={{ duration: 0.5 }}
                        className={`relative rounded-xl border-2 p-4 transition-all flex flex-col ${hasIncident ? 'border-destructive shadow-lg shadow-destructive/10' : 'border-border bg-card'} ${zoneFullscreen ? 'min-h-0' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-heading font-semibold text-foreground ${zoneFullscreen ? 'text-base lg:text-lg' : 'text-sm'}`}>{zone.name}</span>
                          {hasIncident && (
                            <motion.div
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                              className={`rounded-full bg-destructive ${zoneFullscreen ? 'w-4 h-4' : 'w-3 h-3'}`}
                            />
                          )}
                          {!hasIncident && <div className={`rounded-full bg-emerald-500 ${zoneFullscreen ? 'w-4 h-4' : 'w-3 h-3'}`} />}
                        </div>
                        {zoneIncidents.length > 0 && (
                          <Badge variant="destructive" className={`mb-1 ${zoneFullscreen ? 'text-xs' : 'text-[10px]'}`}>{zoneIncidents.length} incident{zoneIncidents.length > 1 ? 'en' : ''}</Badge>
                        )}
                        {!isLive && pct !== null && (
                          <div className="mt-2">
                            <Progress value={pct} className={zoneFullscreen ? 'h-2.5' : 'h-1.5'} />
                            <p className={`text-muted-foreground mt-0.5 ${zoneFullscreen ? 'text-xs' : 'text-[10px]'}`}>{pct}% {t3('klaar', 'terminé', 'done')}</p>
                          </div>
                        )}

                        {/* Always show checklist details when not live */}
                        {!isLive && (
                          <div className={`mt-3 space-y-1 flex-1 ${zoneFullscreen ? 'space-y-2' : ''}`}>
                            {checklistItems.filter(ci => ci.zone_id === zone.id).map(ci => (
                              <div key={ci.id} className={`flex items-center gap-2 ${zoneFullscreen ? 'text-sm' : 'text-xs'}`}>
                                {isItemCompleted(ci.id)
                                  ? <CheckCircle2 className={`text-emerald-500 shrink-0 ${zoneFullscreen ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
                                  : <div className={`rounded-full border border-muted-foreground/40 shrink-0 ${zoneFullscreen ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
                                }
                                <span className={isItemCompleted(ci.id) ? 'text-muted-foreground line-through' : 'text-foreground'}>{ci.description}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
                {unzonedActiveIncidents.length > 0 && (
                  <motion.div
                    animate={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
                    className="mt-3 rounded-xl border-2 border-destructive p-4 flex flex-col shadow-lg shadow-destructive/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-heading font-semibold text-foreground text-sm">📍 Zonder zone</span>
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-3 h-3 rounded-full bg-destructive" />
                    </div>
                    <Badge variant="destructive" className="text-[10px] mb-1">{unzonedActiveIncidents.length} incident{unzonedActiveIncidents.length > 1 ? 'en' : ''}</Badge>
                    <p className="text-[10px] text-muted-foreground">{t3('Incidenten zonder toegewezen zone', 'Incidents sans zone attribuée', 'Incidents without assigned zone')}</p>
                  </motion.div>
                )}
                {zones.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">{t3('Geen zones geconfigureerd voor dit evenement.', 'Aucune zone configurée pour cet événement.', 'No zones configured for this event.')}</p>}
              </CardContent>
            </Card>
          </div>

          {/* Live Incident Sidebar - only show ACTIVE incidents */}
          <div ref={incidentRef} className={`${zoneFullscreen ? 'hidden' : incidentFullscreen ? 'col-span-full' : 'lg:col-span-1'} ${incidentFullscreen ? 'bg-background h-screen flex flex-col' : ''}`}>
            <Card className={`bg-card border-border ${incidentFullscreen ? 'flex-1 flex flex-col border-0 rounded-none' : ''}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-3 shrink-0">
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" /> Live Incidents
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { const next = !incidentFullscreen; setIncidentFullscreen(next); setZoneFullscreen(false); toggleBrowserFullscreen(incidentRef, next); }}>
                  {incidentFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </CardHeader>
              <CardContent className={`space-y-3 ${incidentFullscreen ? 'flex-1 flex flex-col overflow-hidden' : 'max-h-[70vh] overflow-y-auto'}`}>
                {/* Overview map with all active incidents */}
                {activeIncidents.some(i => i.lat && i.lng) && (
                  <div className={incidentFullscreen ? 'shrink-0' : ''}>
                    <IncidentMap incidents={activeIncidents} getTypeName={getIncidentTypeName} height={incidentFullscreen ? 'calc(50vh - 60px)' : '220px'} highlightedIncidentId={highlightedIncidentId} />
                  </div>
                )}
                <div className={incidentFullscreen ? 'flex-1 overflow-y-auto' : ''}>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  <AnimatePresence>
                    {activeIncidents.map(inc => {
                      const incidentType = incidentTypes.find(t => t.id === inc.incident_type_id);
                      const reporter = getReporterInfo(inc.reporter_id);
                      const zonePath = getVolunteerZonePath(inc.reporter_id);
                      const isHighlighted = highlightedIncidentId === inc.id;
                      return (
                        <motion.div
                          key={inc.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          onClick={() => {
                            if (inc.lat && inc.lng) {
                              setHighlightedIncidentId(prev => prev === inc.id ? null : inc.id);
                            }
                          }}
                          className={`rounded-xl border space-y-2 cursor-pointer transition-all ${incidentFullscreen ? 'p-4' : 'p-3'} ${isHighlighted ? 'ring-2 ring-primary border-primary bg-primary/5' : 'hover:border-primary/30'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${statusColor(inc.status)}`} />
                              {incidentType?.emoji && <span className="text-base">{incidentType.emoji}</span>}
                              <span className={`font-medium text-foreground ${incidentFullscreen ? 'text-base' : 'text-sm'}`}>{getIncidentTypeName(inc.incident_type_id)}</span>
                            </div>
                            {incidentType && (
                              <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: incidentType.color }} title={incidentType.label} />
                            )}
                          </div>
                          {/* Location data */}
                          {(inc as any).location_data && Array.isArray((inc as any).location_data) && (inc as any).location_data.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {(inc as any).location_data.map((loc: any, i: number) => (
                                <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-foreground">{loc.level_name}: {loc.option_label}</span>
                              ))}
                            </div>
                          )}

                          {/* Reporter info inline */}
                          {reporter && (
                            <div className="flex items-center gap-2">
                              {reporter.avatar_url ? (
                                <img src={reporter.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                                  {reporter.full_name?.[0]?.toUpperCase() || '?'}
                                </div>
                              )}
                              <span className="text-xs font-medium text-foreground">{reporter.full_name || 'Onbekend'}</span>
                              {zonePath && (
                                <span className="text-[10px] text-muted-foreground truncate ml-1" title={zonePath}>📍 {zonePath}</span>
                              )}
                            </div>
                          )}

                          {inc.description && <p className={`text-muted-foreground ${incidentFullscreen ? 'text-sm' : 'text-xs'}`}>{inc.description}</p>}

                          {/* Show photo if present — clickable to zoom */}
                          {inc.photo_url && (
                            <img
                              src={inc.photo_url}
                              alt="Incident foto"
                              className={`w-full object-cover rounded-lg border border-border cursor-zoom-in hover:opacity-90 transition ${incidentFullscreen ? 'h-48' : 'h-36'}`}
                              onClick={(e) => { e.stopPropagation(); setLightboxUrl(inc.photo_url!); }}
                            />
                          )}

                          <div className={`flex items-center gap-2 text-muted-foreground ${incidentFullscreen ? 'text-xs' : 'text-[10px]'}`}>
                            <MapPin className="w-3 h-3" /> {getZoneName(inc.zone_id)}
                            {inc.lat && inc.lng && (
                              <span className="text-[9px]">({inc.lat.toFixed(4)}, {inc.lng.toFixed(4)})</span>
                            )}
                            <Clock className="w-3 h-3 ml-2" /> {new Date(inc.created_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="flex gap-1.5">
                            {inc.status === 'nieuw' && (
                               <Button size="sm" variant="outline" className={`text-xs ${incidentFullscreen ? 'h-9' : 'h-7'}`} onClick={(e) => { e.stopPropagation(); handleUpdateIncident(inc.id, 'bezig'); }}>
                                 {t3('In behandeling', 'En cours', 'In progress')}
                              </Button>
                            )}
                             <Button size="sm" variant="outline" className={`text-xs text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 ${incidentFullscreen ? 'h-9' : 'h-7'}`} onClick={(e) => { e.stopPropagation(); handleUpdateIncident(inc.id, 'opgelost'); }}>
                               ✓ {t3('Opgelost', 'Résolu', 'Resolved')}
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  </div>
                  {activeIncidents.length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                      <p className="text-muted-foreground text-sm">{isLive ? t3('Geen actieve incidenten', 'Aucun incident actif', 'No active incidents') : t3('Wacht op GO LIVE', 'En attente de GO LIVE', 'Waiting for GO LIVE')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Phone Mockup (demo only) */}
          {isDemoEvent && !zoneFullscreen && !incidentFullscreen && (
            <div className="hidden xl:block">
              <VolunteerPhoneMockup
                zones={zones}
                incidentTypes={incidentTypes}
                checklistItems={checklistItems}
                checklistProgress={checklistProgress}
                isLive={isLive}
                eventTitle={eventTitle}
                eventId={eventId || ''}
                clubId={clubId || ''}
              />
            </div>
          )}
        </div>

        {/* Close Event Confirmation Dialog */}
        <AnimatePresence>
          {showCloseConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
              onClick={() => setShowCloseConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
              >
                <div className="text-center">
                  <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
                  <h2 className="text-xl font-heading font-bold text-foreground">Event afsluiten?</h2>
                  <p className="text-muted-foreground text-sm mt-2">
                    Dit zet GO LIVE uit voor alle vrijwilligers. Ze krijgen een bedankscherm te zien en worden teruggestuurd naar hun dashboard.
                  </p>
                  {activeIncidents.length > 0 && (
                    <div className="mt-3 bg-destructive/10 border border-destructive/30 rounded-xl p-3">
                      <p className="text-sm font-medium text-destructive">
                        ⚠️ Er zijn nog {activeIncidents.length} actieve incident{activeIncidents.length > 1 ? 'en' : ''}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 h-11 rounded-xl"
                    onClick={() => setShowCloseConfirm(false)}
                  >
                    Annuleren
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 h-11 rounded-xl font-bold"
                    disabled={closingEvent}
                    onClick={handleCloseEvent}
                  >
                    {closingEvent ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Ja, sluit event'}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Photo Lightbox — portaled into fullscreen element when active */}
        {createPortal(
          <AnimatePresence>
            {lightboxUrl && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md"
                style={{ zIndex: 2147483647 }}
                onClick={() => setLightboxUrl(null)}
              >
                <div
                  className="overflow-auto max-w-[95vw] max-h-[92vh] flex items-center justify-center touch-pinch-zoom"
                  onClick={(e) => e.stopPropagation()}
                  style={{ cursor: 'zoom-in' }}
                >
                  <motion.img
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    src={lightboxUrl}
                    alt="Incident foto vergroot"
                    className="max-w-none select-none"
                    style={{ maxHeight: '90vh', objectFit: 'contain' }}
                    draggable={false}
                    onClick={(e) => {
                      const img = e.currentTarget;
                      if (img.style.transform === 'scale(2)') {
                        img.style.transform = 'scale(1)';
                        img.style.cursor = 'zoom-in';
                      } else {
                        img.style.transform = 'scale(2)';
                        img.style.cursor = 'zoom-out';
                      }
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full"
                  style={{ zIndex: 2147483647 }}
                  onClick={() => setLightboxUrl(null)}
                >
                  <XCircle className="w-6 h-6" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>,
          document.fullscreenElement || document.body
        )}
      </div>

      {showConfig && clubId && eventId && (
        <SafetyConfigDialog
          open={showConfig}
          onClose={() => setShowConfig(false)}
          eventId={eventId}
          clubId={clubId}
        />
      )}
    </ClubPageLayout>
  );
};

export default SafetyDashboard;
