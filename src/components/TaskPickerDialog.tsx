import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, MapPin, ChevronRight } from 'lucide-react';
import { Language } from '@/i18n/translations';

interface TaskItem {
  id: string;
  title: string;
  task_date: string | null;
  location: string | null;
}

const labels = {
  nl: { title: 'Kies een taak', noTasks: 'Geen taken beschikbaar.' },
  fr: { title: 'Choisissez une tâche', noTasks: 'Aucune tâche disponible.' },
  en: { title: 'Choose a task', noTasks: 'No tasks available.' },
};

interface TaskPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: TaskItem[];
  onSelect: (taskId: string) => void;
  language: Language;
  title?: string;
}

const TaskPickerDialog = ({ open, onOpenChange, tasks, onSelect, language, title }: TaskPickerDialogProps) => {
  const l = labels[language];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title || l.title}</DialogTitle>
        </DialogHeader>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{l.noTasks}</p>
        ) : (
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {tasks.map(task => (
              <button
                key={task.id}
                onClick={() => { onSelect(task.id); onOpenChange(false); }}
                className="w-full flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-accent transition-colors text-left group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    {task.task_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.task_date).toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB')}
                      </span>
                    )}
                    {task.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {task.location}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TaskPickerDialog;
