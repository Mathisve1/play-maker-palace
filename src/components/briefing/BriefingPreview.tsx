import { Clock, FileText, Coffee, CheckSquare, Phone, Route, PenLine, Layers, Image, MapPin, Package } from 'lucide-react';
import { blockTypeConfig, type BlockType } from './BriefingBlockLibrary';

interface ChecklistItem {
  id: string;
  label: string;
  sort_order: number;
}

interface Waypoint {
  id: string;
  label: string;
  description?: string;
  lat: number;
  lng: number;
  arrival_time?: string;
  sort_order: number;
}

interface Block {
  id: string;
  type: BlockType;
  sort_order: number;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  location?: string;
  title?: string;
  description?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_role?: string;
  checklist_items?: ChecklistItem[];
  waypoints?: Waypoint[];
  media_url?: string;
  materials?: string[];
  zone_mode?: 'full' | 'personalized';
  zone_visible_depth?: number | null;
}

interface Group {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  blocks: Block[];
  expanded: boolean;
}

interface BriefingPreviewProps {
  briefingTitle: string;
  groups: Group[];
  taskTitle: string;
  taskData: {
    task_date: string | null;
    start_time: string | null;
    end_time: string | null;
    location: string | null;
    briefing_location: string | null;
    briefing_time: string | null;
  } | null;
  clubName?: string;
}

const BriefingPreview = ({ briefingTitle, groups, taskTitle, taskData, clubName }: BriefingPreviewProps) => {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-border overflow-hidden max-h-[calc(100vh-180px)] overflow-y-auto">
      {/* Cover */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-primary/5 p-6 border-b border-border">
        {clubName && (
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-2">{clubName}</p>
        )}
        <h2 className="text-lg font-bold text-foreground">{briefingTitle || 'Briefing'}</h2>
        <p className="text-xs text-muted-foreground mt-1">{taskTitle}</p>

        {taskData && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
            {taskData.task_date && (
              <span>📅 {new Date(taskData.task_date).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            )}
            {taskData.start_time && (
              <span>🕐 {new Date(taskData.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            )}
            {taskData.location && <span>📍 {taskData.location}</span>}
            {taskData.briefing_location && <span>🏁 {taskData.briefing_location}</span>}
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="p-4 space-y-4">
        {groups.map((group, gi) => (
          <div key={group.id}>
            {/* Section header */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
                {group.name || `Sectie ${gi + 1}`}
              </h3>
            </div>

            {/* Blocks */}
            <div className="space-y-2 pl-4 border-l-2" style={{ borderColor: group.color }}>
              {group.blocks.length === 0 && (
                <p className="text-[10px] text-muted-foreground italic py-2">Geen blokken</p>
              )}
              {group.blocks.map(block => (
                <PreviewBlock key={block.id} block={block} />
              ))}
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-xs">
            <p>Voeg secties en blokken toe om de briefing op te bouwen</p>
          </div>
        )}
      </div>
    </div>
  );
};

const PreviewBlock = ({ block }: { block: Block }) => {
  const config = blockTypeConfig[block.type];
  const Icon = config.icon;

  return (
    <div className="rounded-lg bg-muted/30 p-2.5 text-[11px]">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-muted-foreground" />
        <span className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wide">{config.label}</span>
      </div>

      {block.type === 'time_slot' && (
        <div>
          {(block.start_time || block.end_time) && (
            <p className="font-bold text-foreground">{block.start_time || ''} — {block.end_time || ''}</p>
          )}
          {block.location && <p className="text-primary text-[10px]">📍 {block.location}</p>}
          {block.description && <p className="text-muted-foreground text-[10px] mt-0.5">{block.description}</p>}
        </div>
      )}

      {(block.type === 'instruction' || block.type === 'custom') && (
        <div>
          {block.title && <p className="font-semibold text-foreground">{block.title}</p>}
          {block.description && <p className="text-muted-foreground text-[10px] mt-0.5">{block.description}</p>}
        </div>
      )}

      {block.type === 'pause' && (
        <div className="flex items-center gap-2 text-green-600">
          {block.duration_minutes && <span>{block.duration_minutes} min</span>}
          {block.start_time && <span>om {block.start_time}</span>}
          {block.location && <span>· {block.location}</span>}
        </div>
      )}

      {block.type === 'checklist' && (
        <div>
          {block.title && <p className="font-semibold text-foreground mb-1">{block.title}</p>}
          {(block.checklist_items || []).filter(i => i.label.trim()).map(item => (
            <div key={item.id} className="flex items-center gap-1.5 text-[10px]">
              <div className="w-3 h-3 rounded border border-muted-foreground/30" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {block.type === 'emergency_contact' && (
        <div className="bg-red-50 dark:bg-red-950/20 rounded p-2 border-l-2 border-red-400">
          {block.contact_name && <p className="font-semibold text-red-700 dark:text-red-400">{block.contact_name}</p>}
          <div className="flex gap-2 text-[10px] text-red-600 dark:text-red-400/80">
            {block.contact_role && <span>{block.contact_role}</span>}
            {block.contact_phone && <span>📞 {block.contact_phone}</span>}
          </div>
        </div>
      )}

      {block.type === 'route' && (
        <div>
          {block.title && <p className="font-semibold text-foreground">{block.title}</p>}
          {(block.waypoints || []).map((wp, i) => (
            <div key={wp.id} className="flex items-center gap-1.5 text-[10px] mt-0.5">
              <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[8px] font-bold flex items-center justify-center">{i + 1}</span>
              <span>{wp.label}</span>
              {wp.arrival_time && <span className="text-muted-foreground">({wp.arrival_time})</span>}
            </div>
          ))}
        </div>
      )}

      {block.type === 'zone_overview' && (
        <div className="text-muted-foreground italic text-[10px]">
          <Layers className="w-3 h-3 inline mr-1" />
          Zone-overzicht wordt automatisch geladen ({block.zone_mode === 'personalized' ? 'gepersonaliseerd' : block.zone_visible_depth ? `tot niveau ${block.zone_visible_depth}` : 'volledig overzicht'})
        </div>
      )}

      {block.type === 'materials_checklist' && (
        <div>
          {block.title && <p className="font-semibold text-foreground">{block.title}</p>}
          {(block.materials || []).filter(m => m.trim()).map((mat, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
              <Package className="w-3 h-3 text-orange-500" />
              <span>{mat}</span>
            </div>
          ))}
        </div>
      )}

      {block.type === 'media' && (
        <div className="text-muted-foreground italic text-[10px]">
          <Image className="w-3 h-3 inline mr-1" />
          {block.media_url ? 'Media bijgevoegd' : 'Geen media geüpload'}
        </div>
      )}

      {block.type === 'map_overview' && (
        <div className="text-muted-foreground italic text-[10px]">
          <MapPin className="w-3 h-3 inline mr-1" />
          Interactieve plattegrond
        </div>
      )}
    </div>
  );
};

export default BriefingPreview;
