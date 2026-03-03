import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StepStatus = 'completed' | 'active' | 'upcoming';

interface Step {
  label: string;
  status: StepStatus;
}

interface VolunteerStepperProps {
  steps: Step[];
}

const VolunteerStepper = ({ steps }: VolunteerStepperProps) => {
  return (
    <div className="flex items-center gap-0.5">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-0.5">
          <div className="flex items-center gap-1">
            <div className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors',
              step.status === 'completed' && 'bg-green-500 text-white',
              step.status === 'active' && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
              step.status === 'upcoming' && 'bg-muted text-muted-foreground',
            )}>
              {step.status === 'completed' ? <Check className="w-3 h-3" /> : i + 1}
            </div>
            <span className={cn(
              'text-[10px] whitespace-nowrap hidden sm:inline',
              step.status === 'completed' && 'text-green-600 font-medium',
              step.status === 'active' && 'text-primary font-semibold',
              step.status === 'upcoming' && 'text-muted-foreground',
            )}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn(
              'w-4 h-0.5 shrink-0',
              step.status === 'completed' ? 'bg-green-500' : 'bg-border',
            )} />
          )}
        </div>
      ))}
    </div>
  );
};

export default VolunteerStepper;
