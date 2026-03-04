import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';

interface Block {
  id: string;
  title?: string;
  media_url?: string;
}

interface MediaBlockEditorProps {
  block: Block;
  groupId: string;
  onUpdate: (groupId: string, blockId: string, updates: Partial<Block>) => void;
}

const t3 = (nl: string, fr: string, en: string, lang: string) => lang === 'fr' ? fr : lang === 'en' ? en : nl;

const MediaBlockEditor = ({ block, groupId, onUpdate }: MediaBlockEditorProps) => {
  const { language } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(t3('Bestand is te groot (max 10MB)', 'Fichier trop volumineux (max 10 Mo)', 'File is too large (max 10MB)', language));
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t3(
        'Ongeldig bestandstype. Gebruik JPG, PNG, WEBP, GIF, MP4 of WEBM.',
        'Type de fichier invalide. Utilisez JPG, PNG, WEBP, GIF, MP4 ou WEBM.',
        'Invalid file type. Use JPG, PNG, WEBP, GIF, MP4 or WEBM.',
        language
      ));
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t3('Niet ingelogd', 'Non connecté', 'Not logged in', language));

      const ext = file.name.split('.').pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('briefing-media')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('briefing-media')
        .getPublicUrl(path);

      onUpdate(groupId, block.id, { media_url: publicUrl });
      toast.success(t3('Media geüpload!', 'Média téléchargé !', 'Media uploaded!', language));
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(t3('Upload mislukt: ', 'Échec du téléchargement : ', 'Upload failed: ', language) + (err.message || t3('Onbekende fout', 'Erreur inconnue', 'Unknown error', language)));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveMedia = () => {
    onUpdate(groupId, block.id, { media_url: '' });
  };

  const isVideo = block.media_url?.match(/\.(mp4|webm)(\?|$)/i);

  return (
    <div className="space-y-2">
      <Input
        value={block.title || ''}
        onChange={e => onUpdate(groupId, block.id, { title: e.target.value })}
        placeholder={t3('Bijschrift', 'Légende', 'Caption', language)}
        className="bg-background/60 text-sm"
      />

      {block.media_url ? (
        <div className="relative group">
          {isVideo ? (
            <video src={block.media_url} controls className="rounded-lg max-h-40 w-full object-cover" />
          ) : (
            <img src={block.media_url} alt="" className="rounded-lg max-h-32 object-cover w-full" />
          )}
          <button
            onClick={handleRemoveMedia}
            className="absolute top-1.5 right-1.5 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 text-xs"
          >
            {uploading ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> {t3('Uploaden...', 'Téléchargement...', 'Uploading...', language)}</>
            ) : (
              <><Upload className="w-3.5 h-3.5 mr-1.5" /> {t3('Bestand uploaden', 'Télécharger un fichier', 'Upload file', language)}</>
            )}
          </Button>
        </div>
      )}

      {!block.media_url && (
        <Input
          value=""
          onChange={e => onUpdate(groupId, block.id, { media_url: e.target.value })}
          placeholder={t3('Of plak een URL', 'Ou collez une URL', 'Or paste a URL', language)}
          className="bg-background/60 text-xs"
        />
      )}
    </div>
  );
};

export default MediaBlockEditor;
