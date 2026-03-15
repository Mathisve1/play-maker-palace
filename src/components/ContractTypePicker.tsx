import { Language } from '@/i18n/translations';

export type ContractTypeKey = 'steward' | 'bar_catering' | 'terrain_material' | 'admin_ticketing' | 'event_support';

interface ContractTypeOption {
  key: ContractTypeKey;
  icon: string;
  nl: string;
  fr: string;
  en: string;
  descNl: string;
  descFr: string;
  descEn: string;
}

export const CONTRACT_TYPES: ContractTypeOption[] = [
  {
    key: 'steward',
    icon: '🛡️',
    nl: 'Steward / Veiligheidsmedewerker',
    fr: 'Steward / Agent de sécurité',
    en: 'Steward / Safety Officer',
    descNl: 'Veiligheid, crowd control, toegangscontrole',
    descFr: 'Sécurité, contrôle de foule, accès',
    descEn: 'Safety, crowd control, access management',
  },
  {
    key: 'bar_catering',
    icon: '🍺',
    nl: 'Bar- en Cateringpersoneel',
    fr: 'Personnel Bar & Traiteur',
    en: 'Bar & Catering Staff',
    descNl: 'Drankvoorziening, eten, hospitality',
    descFr: 'Boissons, nourriture, hospitalité',
    descEn: 'Beverages, food service, hospitality',
  },
  {
    key: 'terrain_material',
    icon: '⚽',
    nl: 'Terreinverzorger / Materiaalbeheerder',
    fr: 'Préparateur de terrain / Matériel',
    en: 'Groundskeeper / Materials Manager',
    descNl: 'Terreinonderhoud, opbouw, afbraak',
    descFr: 'Entretien du terrain, montage, démontage',
    descEn: 'Field maintenance, setup, breakdown',
  },
  {
    key: 'admin_ticketing',
    icon: '📋',
    nl: 'Administratief / Ticketing',
    fr: 'Administratif / Billetterie',
    en: 'Admin / Ticketing',
    descNl: 'Administratie, ticketverkoop, onthaal',
    descFr: 'Administration, vente de tickets, accueil',
    descEn: 'Administration, ticket sales, reception',
  },
  {
    key: 'event_support',
    icon: '🎉',
    nl: 'Event Support / Allround Helper',
    fr: 'Support événement / Polyvalent',
    en: 'Event Support / All-round Helper',
    descNl: 'Flexibel inzetbaar, diverse taken',
    descFr: 'Polyvalent, tâches diverses',
    descEn: 'Flexible deployment, various tasks',
  },
];

interface ContractTypePickerProps {
  selected: Set<ContractTypeKey>;
  onChange: (selected: Set<ContractTypeKey>) => void;
  language: Language;
  multiSelect?: boolean;
}

const ContractTypePicker = ({ selected, onChange, language, multiSelect = true }: ContractTypePickerProps) => {
  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const toggle = (key: ContractTypeKey) => {
    const next = new Set(selected);
    if (multiSelect) {
      if (next.has(key)) next.delete(key); else next.add(key);
    } else {
      next.clear();
      next.add(key);
    }
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground mb-2">
        {t3('Contracttype', 'Type de contrat', 'Contract type')}
        {multiSelect && <span className="text-xs text-muted-foreground ml-1">({t3('meerdere mogelijk', 'plusieurs possibles', 'multiple allowed')})</span>}
      </p>
      <div className="grid gap-2">
        {CONTRACT_TYPES.map(ct => {
          const isActive = selected.has(ct.key);
          const label = language === 'nl' ? ct.nl : language === 'fr' ? ct.fr : ct.en;
          const desc = language === 'nl' ? ct.descNl : language === 'fr' ? ct.descFr : ct.descEn;

          return (
            <button
              key={ct.key}
              type="button"
              onClick={() => toggle(ct.key)}
              className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border hover:border-primary/30 hover:bg-muted/30'
              }`}
            >
              <span className="text-xl mt-0.5">{ct.icon}</span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>{label}</p>
                <p className="text-[11px] text-muted-foreground">{desc}</p>
              </div>
              {isActive && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ContractTypePicker;
