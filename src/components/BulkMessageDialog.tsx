import { useState } from 'react';
import { X, Send, Users, Eye, ChevronDown, ChevronUp, Loader2, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Volunteer {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface Props {
  taskId: string;
  taskTitle: string;
  clubOwnerId: string;
  volunteers: Volunteer[];
  onClose: () => void;
}

const templateVars: { key: string; label: string; description: string }[] = [
  { key: '{{naam}}', label: 'Naam', description: 'Volledige naam van de vrijwilliger' },
  { key: '{{email}}', label: 'E-mail', description: 'E-mailadres van de vrijwilliger' },
  { key: '{{taak}}', label: 'Taak', description: 'Titel van de taak' },
];

const BulkMessageDialog = ({ taskId, taskTitle, clubOwnerId, volunteers, onClose }: Props) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedVolunteers, setSelectedVolunteers] = useState<Set<string>>(
    new Set(volunteers.map(v => v.id))
  );
  const [showVars, setShowVars] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const toggleVolunteer = (id: string) => {
    setSelectedVolunteers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedVolunteers.size === volunteers.length) {
      setSelectedVolunteers(new Set());
    } else {
      setSelectedVolunteers(new Set(volunteers.map(v => v.id)));
    }
  };

  const resolveTemplate = (template: string, volunteer: Volunteer): string => {
    return template
      .replace(/\{\{naam\}\}/gi, volunteer.full_name || 'Vrijwilliger')
      .replace(/\{\{email\}\}/gi, volunteer.email || '')
      .replace(/\{\{taak\}\}/gi, taskTitle);
  };

  const insertVariable = (varKey: string) => {
    setMessage(prev => prev + varKey);
  };

  const handleSend = async () => {
    if (!message.trim() || selectedVolunteers.size === 0) return;
    setSending(true);
    setSentCount(0);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSending(false); return; }

    let sent = 0;
    const selected = volunteers.filter(v => selectedVolunteers.has(v.id));

    for (const volunteer of selected) {
      try {
        // Find or create conversation
        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .eq('task_id', taskId)
          .eq('volunteer_id', volunteer.id)
          .eq('club_owner_id', clubOwnerId)
          .maybeSingle();

        let conversationId = existing?.id;

        if (!conversationId) {
          const { data: created, error: createError } = await supabase
            .from('conversations')
            .insert({
              task_id: taskId,
              volunteer_id: volunteer.id,
              club_owner_id: clubOwnerId,
            })
            .select('id')
            .single();

          if (createError) {
            console.error('Failed to create conversation for', volunteer.email, createError);
            continue;
          }
          conversationId = created.id;
        }

        // Send personalized message
        const personalizedMessage = resolveTemplate(message, volunteer);
        const { error: msgError } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: session.user.id,
          content: personalizedMessage,
        });

        if (msgError) {
          console.error('Failed to send message to', volunteer.email, msgError);
          continue;
        }

        // Update conversation timestamp
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);

        sent++;
        setSentCount(sent);
      } catch (err) {
        console.error('Error sending to', volunteer.email, err);
      }
    }

    if (sent === selected.length) {
      toast.success(`Bericht verstuurd naar ${sent} vrijwilliger${sent > 1 ? 's' : ''}!`);
    } else if (sent > 0) {
      toast.warning(`${sent} van ${selected.length} berichten verstuurd.`);
    } else {
      toast.error('Geen berichten konden worden verstuurd.');
    }

    setSending(false);
    if (sent > 0) onClose();
  };

  const previewVolunteer = volunteers.find(v => selectedVolunteers.has(v.id)) || volunteers[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-elevated p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Bericht versturen
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Stuur een bericht naar vrijwilligers voor <span className="font-medium text-foreground">{taskTitle}</span>
        </p>

        {/* Volunteer selection */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Ontvangers ({selectedVolunteers.size}/{volunteers.length})
            </h3>
            <button
              onClick={toggleAll}
              className="text-xs text-primary hover:underline"
            >
              {selectedVolunteers.size === volunteers.length ? 'Deselecteer alles' : 'Selecteer alles'}
            </button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {volunteers.map(v => (
              <label
                key={v.id}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedVolunteers.has(v.id)}
                  onChange={() => toggleVolunteer(v.id)}
                  className="rounded border-input text-primary focus:ring-ring w-4 h-4"
                />
                <span className="text-sm text-foreground truncate">{v.full_name || v.email || 'Onbekend'}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Template variables info */}
        <div className="mb-3">
          <button
            onClick={() => setShowVars(!showVars)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            Dynamische variabelen
            {showVars ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showVars && (
            <div className="mt-2 p-3 rounded-xl bg-muted/30 border border-border space-y-1.5">
              <p className="text-xs text-muted-foreground mb-2">
                Klik om in te voegen. Variabelen worden automatisch vervangen per vrijwilliger.
              </p>
              {templateVars.map(v => (
                <button
                  key={v.key}
                  onClick={() => insertVariable(v.key)}
                  className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">{v.key}</code>
                  <span className="text-xs text-muted-foreground">{v.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message input */}
        <div className="mb-3">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Typ je bericht... Gebruik {{naam}} om automatisch de naam van elke vrijwilliger in te voegen."
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            rows={4}
            maxLength={2000}
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">{message.length}/2000</span>
          </div>
        </div>

        {/* Preview toggle */}
        {message.trim() && (
          <div className="mb-4">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Eye className="w-3.5 h-3.5" />
              {showPreview ? 'Verberg voorbeeld' : 'Voorbeeld bekijken'}
            </button>
            {showPreview && previewVolunteer && (
              <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-[10px] text-muted-foreground mb-1">
                  Voorbeeld voor: {previewVolunteer.full_name || previewVolunteer.email}
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {resolveTemplate(message, previewVolunteer)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Send button */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {sending && `${sentCount}/${selectedVolunteers.size} verstuurd...`}
          </span>
          <button
            onClick={handleSend}
            disabled={sending || !message.trim() || selectedVolunteers.size === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Versturen...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Verstuur naar {selectedVolunteers.size} vrijwilliger{selectedVolunteers.size !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkMessageDialog;
