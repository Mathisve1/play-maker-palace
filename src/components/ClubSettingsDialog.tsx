import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Upload, Save } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

interface ClubInfo {
  name: string;
  sport: string | null;
  location: string | null;
  logo_url: string | null;
}

interface Props {
  clubId: string;
  clubInfo: ClubInfo;
  onClose: () => void;
  onUpdated: (info: ClubInfo) => void;
}

const ClubSettingsDialog = ({ clubId, clubInfo, onClose, onUpdated }: Props) => {
  const { language } = useLanguage();
  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;
  const [name, setName] = useState(clubInfo.name);
  const [sport, setSport] = useState(clubInfo.sport || '');
  const [location, setLocation] = useState(clubInfo.location || '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(clubInfo.logo_url);
  const [saving, setSaving] = useState(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t3('Logo mag maximaal 5MB zijn', 'Le logo ne peut pas dépasser 5 Mo', 'Logo must be max 5MB'));
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t3('Clubnaam is verplicht', 'Le nom du club est obligatoire', 'Club name is required'));
      return;
    }
    setSaving(true);

    let logoUrl = clubInfo.logo_url;

    // Upload new logo if selected
    if (logoFile) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const ext = logoFile.name.split('.').pop();
        const filePath = `${session.user.id}/logo.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('club-logos')
          .upload(filePath, logoFile, { upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('club-logos')
            .getPublicUrl(filePath);
          logoUrl = urlData.publicUrl;
        }
      }
    }

    const { error } = await supabase
      .from('clubs')
      .update({
        name: name.trim(),
        sport: sport.trim() || null,
        location: location.trim() || null,
        logo_url: logoUrl,
      })
      .eq('id', clubId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t3('Club gegevens bijgewerkt!', 'Informations du club mises à jour!', 'Club details updated!'));
      onUpdated({ name: name.trim(), sport: sport.trim() || null, location: location.trim() || null, logo_url: logoUrl });
      onClose();
    }
    setSaving(false);
  };

  const inputClass = "w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-elevated p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-semibold text-foreground">{t3('Club instellingen', 'Paramètres du club', 'Club settings')}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Logo */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t3('Logo', 'Logo', 'Logo')}</label>
            <div className="flex items-center gap-3">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-14 h-14 rounded-xl object-cover border border-border" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-muted-foreground text-lg font-bold">
                  {name[0]?.toUpperCase() || '?'}
                </div>
              )}
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-input cursor-pointer hover:bg-muted/50 transition-colors text-sm text-muted-foreground">
                <Upload className="w-4 h-4" />
                {t3('Wijzig logo', 'Modifier le logo', 'Change logo')}
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Clubnaam *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} maxLength={200} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Sport</label>
              <input type="text" value={sport} onChange={e => setSport(e.target.value)} maxLength={100} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Locatie</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} maxLength={200} className={inputClass} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors">
            Annuleren
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClubSettingsDialog;
