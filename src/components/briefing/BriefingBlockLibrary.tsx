import {
  Clock, FileText, Coffee, CheckSquare, Phone, Route, PenLine,
  MapPin, Image, Package, Layers,
} from 'lucide-react';

export type BlockType = 'time_slot' | 'instruction' | 'pause' | 'checklist' | 'emergency_contact' | 'route' | 'custom' | 'zone_overview' | 'media' | 'map_overview' | 'materials_checklist';

export const blockTypeConfig: Record<BlockType, { icon: typeof Clock; label: string; color: string; description: string }> = {
  time_slot: { icon: Clock, label: 'Tijdslot', color: 'bg-blue-500/10 text-blue-600 border-blue-200', description: 'Start- en eindtijd met locatie' },
  instruction: { icon: FileText, label: 'Instructie', color: 'bg-amber-500/10 text-amber-600 border-amber-200', description: 'Titel en beschrijving' },
  pause: { icon: Coffee, label: 'Pauze', color: 'bg-green-500/10 text-green-600 border-green-200', description: 'Pauzemoment met duur' },
  checklist: { icon: CheckSquare, label: 'Checklist', color: 'bg-purple-500/10 text-purple-600 border-purple-200', description: 'Afvinkbare items' },
  emergency_contact: { icon: Phone, label: 'Noodcontact', color: 'bg-red-500/10 text-red-600 border-red-200', description: 'Contactpersoon bij nood' },
  route: { icon: Route, label: 'Route', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-200', description: 'Kaart met waypoints' },
  custom: { icon: PenLine, label: 'Vrij veld', color: 'bg-slate-500/10 text-slate-600 border-slate-200', description: 'Aangepaste tekst' },
  zone_overview: { icon: Layers, label: 'Zones', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200', description: 'Zone-toewijzingen & wristbands' },
  media: { icon: Image, label: 'Media', color: 'bg-pink-500/10 text-pink-600 border-pink-200', description: 'Foto of video' },
  map_overview: { icon: MapPin, label: 'Plattegrond', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', description: 'Interactieve kaart met zones' },
  materials_checklist: { icon: Package, label: 'Materialen', color: 'bg-orange-500/10 text-orange-600 border-orange-200', description: 'Op te halen materialen' },
};

interface BriefingBlockLibraryProps {
  onAddBlock: (type: BlockType) => void;
}

const BriefingBlockLibrary = ({ onAddBlock }: BriefingBlockLibraryProps) => {
  const categories = [
    { label: 'Basis', types: ['time_slot', 'instruction', 'pause', 'custom'] as BlockType[] },
    { label: 'Interactie', types: ['checklist', 'materials_checklist', 'emergency_contact'] as BlockType[] },
    { label: 'Locatie & Zones', types: ['route', 'zone_overview', 'map_overview'] as BlockType[] },
    { label: 'Media', types: ['media'] as BlockType[] },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Blokken</h3>
      {categories.map(cat => (
        <div key={cat.label}>
          <p className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-1.5 px-1">{cat.label}</p>
          <div className="space-y-1">
            {cat.types.map(type => {
              const config = blockTypeConfig[type];
              const Icon = config.icon;
              return (
                <button
                  key={type}
                  onClick={() => onAddBlock(type)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border/50 bg-card hover:bg-accent/50 hover:border-border transition-all text-left group cursor-grab active:cursor-grabbing"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('blockType', type);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                >
                  <div className={`p-1.5 rounded-md ${config.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground">{config.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{config.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BriefingBlockLibrary;
