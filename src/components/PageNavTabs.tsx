import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TabItem {
  label: string;
  path: string;
}

interface PageNavTabsProps {
  tabs: TabItem[];
}

const PageNavTabs = ({ tabs }: PageNavTabsProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex gap-1 p-1 rounded-lg bg-muted w-fit">
      {tabs.map((tab) => {
        const active = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default PageNavTabs;
