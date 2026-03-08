import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Award, Loader2, Upload, Palette, Eye, Save, Trash2, Plus
} from 'lucide-react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CertificateDesign {
  id: string;
  club_id: string;
  name: string;
  issuer_name: string | null;
  issuer_title: string | null;
  signature_url: string | null;
  accent_color: string;
  custom_text: string | null;
  created_at: string;
}

const labels = {
  nl: {
    title: 'Certificaat ontwerpen', back: 'Terug', save: 'Opslaan', saved: 'Opgeslagen!',
    templateName: 'Sjabloonnaam', issuerName: 'Naam uitreiker', issuerTitle: 'Functie uitreiker',
    accentColor: 'Accentkleur', customText: 'Extra tekst op certificaat',
    uploadSignature: 'Handtekening uploaden', preview: 'Voorbeeld',
    noDesigns: 'Nog geen certificaatontwerpen.', createDesign: 'Nieuw ontwerp',
    deleteConfirm: 'Weet je zeker dat je dit ontwerp wilt verwijderen?',
    deleted: 'Ontwerp verwijderd', volunteerName: 'Naam vrijwilliger',
    trainingName: 'Naam training', dateLabel: 'Datum', certTitle: 'Certificaat van deelname',
    certBody: 'heeft met succes deelgenomen aan de training', signaturePlaceholder: 'Upload een handtekening (afbeelding)',
  },
  fr: {
    title: 'Concevoir certificat', back: 'Retour', save: 'Enregistrer', saved: 'Enregistré !',
    templateName: 'Nom du modèle', issuerName: 'Nom de l\'émetteur', issuerTitle: 'Fonction de l\'émetteur',
    accentColor: 'Couleur d\'accent', customText: 'Texte supplémentaire',
    uploadSignature: 'Télécharger signature', preview: 'Aperçu',
    noDesigns: 'Aucun modèle de certificat.', createDesign: 'Nouveau modèle',
    deleteConfirm: 'Êtes-vous sûr de vouloir supprimer ce modèle ?',
    deleted: 'Modèle supprimé', volunteerName: 'Nom du volontaire',
    trainingName: 'Nom de la formation', dateLabel: 'Date', certTitle: 'Certificat de participation',
    certBody: 'a participé avec succès à la formation', signaturePlaceholder: 'Télécharger une signature (image)',
  },
  en: {
    title: 'Design certificate', back: 'Back', save: 'Save', saved: 'Saved!',
    templateName: 'Template name', issuerName: 'Issuer name', issuerTitle: 'Issuer title',
    accentColor: 'Accent color', customText: 'Additional text on certificate',
    uploadSignature: 'Upload signature', preview: 'Preview',
    noDesigns: 'No certificate designs yet.', createDesign: 'New design',
    deleteConfirm: 'Are you sure you want to delete this design?',
    deleted: 'Design deleted', volunteerName: 'Volunteer name',
    trainingName: 'Training name', dateLabel: 'Date', certTitle: 'Certificate of Participation',
    certBody: 'has successfully participated in the training', signaturePlaceholder: 'Upload a signature (image)',
  },
};

const CertificateBuilder = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const l = labels[language];

  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [clubName, setClubName] = useState('');
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [designs, setDesigns] = useState<CertificateDesign[]>([]);

  // Editor state
  const [editingDesign, setEditingDesign] = useState<CertificateDesign | null>(null);
  const [formName, setFormName] = useState('');
  const [formIssuerName, setFormIssuerName] = useState('');
  const [formIssuerTitle, setFormIssuerTitle] = useState('');
  const [formAccentColor, setFormAccentColor] = useState('#1e40af');
  const [formCustomText, setFormCustomText] = useState('');
  const [formSignatureUrl, setFormSignatureUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/club-login'); return; }

    let cid: string | null = null;
    const { data: ownClub } = await supabase.from('clubs').select('id, name, logo_url').eq('owner_id', session.user.id).maybeSingle();
    if (ownClub) { cid = ownClub.id; setClubName(ownClub.name); setClubLogo(ownClub.logo_url); }
    else {
      const { data: membership } = await supabase.from('club_members').select('club_id').eq('user_id', session.user.id).limit(1).maybeSingle();
      if (membership) {
        cid = membership.club_id;
        const { data: club } = await supabase.from('clubs').select('name, logo_url').eq('id', cid).maybeSingle();
        if (club) { setClubName(club.name); setClubLogo(club.logo_url); }
      }
    }
    if (!cid) { navigate('/club-dashboard'); return; }
    setClubId(cid);
    await loadDesigns(cid);
    setLoading(false);
  };

  const loadDesigns = async (cid: string) => {
    const { data } = await supabase.from('certificate_designs').select('*').eq('club_id', cid).order('created_at', { ascending: false });
    setDesigns((data || []) as CertificateDesign[]);
  };

  const openEditor = (design?: CertificateDesign) => {
    if (design) {
      setEditingDesign(design);
      setFormName(design.name);
      setFormIssuerName(design.issuer_name || '');
      setFormIssuerTitle(design.issuer_title || '');
      setFormAccentColor(design.accent_color || '#1e40af');
      setFormCustomText(design.custom_text || '');
      setFormSignatureUrl(design.signature_url);
    } else {
      setEditingDesign({ id: '', club_id: clubId!, name: '', issuer_name: null, issuer_title: null, signature_url: null, accent_color: '#1e40af', custom_text: null, created_at: '' });
      setFormName('');
      setFormIssuerName('');
      setFormIssuerTitle('');
      setFormAccentColor('#1e40af');
      setFormCustomText('');
      setFormSignatureUrl(null);
    }
  };

  const handleUploadSignature = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clubId) return;
    setUploading(true);
    const path = `${clubId}/signature-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('club-signatures').upload(path, file);
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('club-signatures').getPublicUrl(path);
    setFormSignatureUrl(publicUrl);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!clubId || !formName.trim()) return;
    setSaving(true);

    const payload = {
      club_id: clubId,
      name: formName,
      issuer_name: formIssuerName || null,
      issuer_title: formIssuerTitle || null,
      signature_url: formSignatureUrl,
      accent_color: formAccentColor,
      custom_text: formCustomText || null,
    };

    if (editingDesign?.id) {
      await supabase.from('certificate_designs').update(payload).eq('id', editingDesign.id);
    } else {
      await supabase.from('certificate_designs').insert(payload);
    }

    toast.success(l.saved);
    setSaving(false);
    setEditingDesign(null);
    await loadDesigns(clubId);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(l.deleteConfirm)) return;
    await supabase.from('certificate_designs').delete().eq('id', id);
    toast.success(l.deleted);
    if (clubId) await loadDesigns(clubId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/90 backdrop-blur-xl sticky top-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="px-4 h-14 flex items-center justify-between max-w-4xl mx-auto">
          <button onClick={() => navigate('/academy/physical-trainings')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> {l.back}
          </button>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            <h1 className="font-heading font-semibold text-foreground">{l.title}</h1>
          </div>
          <Logo size="sm" linkTo="/club-dashboard" />
        </div>
      </header>

      <main className="px-4 py-6 pb-tab-bar max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-heading font-bold text-foreground">{l.title}</h2>
          <Button onClick={() => openEditor()} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" /> {l.createDesign}
          </Button>
        </div>

        {designs.length === 0 && !editingDesign ? (
          <div className="text-center py-16">
            <Award className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">{l.noDesigns}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {designs.map((design, i) => (
              <motion.div key={design.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-border bg-card overflow-hidden shadow-card p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: design.accent_color + '20' }}>
                      <Award className="w-5 h-5" style={{ color: design.accent_color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{design.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {design.issuer_name && `${design.issuer_name}`}
                        {design.issuer_title && ` · ${design.issuer_title}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => { openEditor(design); setShowPreview(true); }} className="gap-1 text-xs">
                      <Eye className="w-3.5 h-3.5" /> {l.preview}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEditor(design)} className="gap-1 text-xs">
                      <Palette className="w-3.5 h-3.5" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(design.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Editor Dialog */}
      {editingDesign !== null && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) { setEditingDesign(null); setShowPreview(false); } }}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" /> {editingDesign.id ? 'Edit' : l.createDesign}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Form */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground">{l.templateName}</label>
                  <Input value={formName} onChange={e => setFormName(e.target.value)} className="mt-1" placeholder="Bv. Steward Certificaat" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">{l.issuerName}</label>
                  <Input value={formIssuerName} onChange={e => setFormIssuerName(e.target.value)} className="mt-1" placeholder="Jan Janssens" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">{l.issuerTitle}</label>
                  <Input value={formIssuerTitle} onChange={e => setFormIssuerTitle(e.target.value)} className="mt-1" placeholder="Voorzitter" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">{l.accentColor}</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={formAccentColor} onChange={e => setFormAccentColor(e.target.value)} className="w-10 h-10 rounded-lg border border-input cursor-pointer" />
                    <Input value={formAccentColor} onChange={e => setFormAccentColor(e.target.value)} className="flex-1 font-mono text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">{l.customText}</label>
                  <Textarea value={formCustomText} onChange={e => setFormCustomText(e.target.value)} rows={2} className="mt-1" placeholder={language === 'nl' ? 'Bv. Conform de Belgische wetgeving inzake vrijwilligerswerk.' : 'Additional text...'} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">{l.uploadSignature}</label>
                  {formSignatureUrl ? (
                    <div className="mt-1 flex items-center gap-3">
                      <img src={formSignatureUrl} alt="Signature" className="h-12 object-contain bg-white rounded border border-border p-1" />
                      <Button variant="ghost" size="sm" onClick={() => setFormSignatureUrl(null)} className="text-destructive text-xs">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-input cursor-pointer hover:border-primary/50 transition-colors">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{uploading ? '...' : l.signaturePlaceholder}</span>
                      <input type="file" accept="image/*" onChange={handleUploadSignature} className="hidden" />
                    </label>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSave} disabled={saving || !formName.trim()} className="flex-1 gap-1.5">
                    <Save className="w-4 h-4" /> {saving ? '...' : l.save}
                  </Button>
                  <Button variant="outline" onClick={() => setShowPreview(!showPreview)} className="gap-1.5">
                    <Eye className="w-4 h-4" /> {l.preview}
                  </Button>
                </div>
              </div>

              {/* Live Preview */}
              <div className={`${showPreview ? 'block' : 'hidden md:block'}`}>
                <CertificatePreviewCard
                  clubName={clubName}
                  clubLogo={clubLogo}
                  issuerName={formIssuerName}
                  issuerTitle={formIssuerTitle}
                  signatureUrl={formSignatureUrl}
                  accentColor={formAccentColor}
                  customText={formCustomText}
                  language={language}
                  labels={l}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Live preview component
const CertificatePreviewCard = ({
  clubName, clubLogo, issuerName, issuerTitle, signatureUrl, accentColor, customText, language, labels: l,
}: {
  clubName: string; clubLogo: string | null; issuerName: string; issuerTitle: string;
  signatureUrl: string | null; accentColor: string; customText: string; language: string; labels: any;
}) => {
  const today = new Date().toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="bg-white rounded-xl border-2 shadow-lg overflow-hidden" style={{ borderColor: accentColor }}>
      {/* Top accent bar */}
      <div className="h-2" style={{ backgroundColor: accentColor }} />

      <div className="p-6 space-y-4">
        {/* Header: logo + club */}
        <div className="flex items-center justify-between">
          {clubLogo ? (
            <img src={clubLogo} alt={clubName} className="h-10 w-auto object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: accentColor }}>
              {clubName[0]}
            </div>
          )}
          <p className="text-xs text-gray-500 font-medium">{clubName}</p>
        </div>

        {/* Title */}
        <div className="text-center py-3">
          <Award className="w-8 h-8 mx-auto mb-2" style={{ color: accentColor }} />
          <h2 className="text-lg font-bold tracking-wide uppercase" style={{ color: accentColor }}>
            {l.certTitle}
          </h2>
        </div>

        {/* Body */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500">{language === 'nl' ? 'Dit certificaat wordt verleend aan' : language === 'fr' ? 'Ce certificat est attribué à' : 'This certificate is awarded to'}</p>
          <p className="text-xl font-bold text-gray-900 border-b-2 border-dashed pb-1 inline-block px-8" style={{ borderColor: accentColor + '60' }}>
            {l.volunteerName}
          </p>
          <p className="text-sm text-gray-500 pt-2">{l.certBody}</p>
          <p className="text-base font-semibold text-gray-800 italic">"Steward Opleiding"</p>
        </div>

        {/* Custom text */}
        {customText && (
          <p className="text-xs text-gray-400 text-center italic">{customText}</p>
        )}

        {/* Date */}
        <p className="text-center text-sm text-gray-500">{l.dateLabel}: {today}</p>

        {/* Signature */}
        <div className="flex items-end justify-between pt-4 border-t border-gray-100">
          <div className="text-center">
            {signatureUrl ? (
              <img src={signatureUrl} alt="Signature" className="h-10 object-contain mb-1" />
            ) : (
              <div className="h-10 w-32 border-b-2 border-gray-300 mb-1" />
            )}
            <p className="text-xs font-semibold text-gray-700">{issuerName || '...'}</p>
            <p className="text-[10px] text-gray-400">{issuerTitle || '...'}</p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full border-2 flex items-center justify-center" style={{ borderColor: accentColor + '40' }}>
              <Award className="w-6 h-6" style={{ color: accentColor }} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom accent bar */}
      <div className="h-1.5" style={{ backgroundColor: accentColor }} />
    </div>
  );
};

export default CertificateBuilder;
