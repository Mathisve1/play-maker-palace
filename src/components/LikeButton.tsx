import { useState } from 'react';
import { Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
  taskId: string;
  liked: boolean;
  count: number;
  onToggle: (taskId: string, liked: boolean) => void;
  size?: 'sm' | 'md';
}

const LikeButton = ({ taskId, liked, count, onToggle, size = 'sm' }: LikeButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    if (liked) {
      const { error } = await supabase
        .from('task_likes')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', session.user.id);
      if (error) toast.error(error.message);
      else onToggle(taskId, false);
    } else {
      const { error } = await supabase
        .from('task_likes')
        .insert({ task_id: taskId, user_id: session.user.id });
      if (error) toast.error(error.message);
      else onToggle(taskId, true);
    }
    setLoading(false);
  };

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'flex items-center gap-1 rounded-lg transition-all',
        size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        liked
          ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20'
          : 'text-muted-foreground hover:text-red-500 hover:bg-red-500/5',
        loading && 'opacity-50'
      )}
    >
      <Heart className={cn(iconSize, liked && 'fill-current')} />
      {count > 0 && <span className="font-medium">{count}</span>}
    </button>
  );
};

export default LikeButton;
