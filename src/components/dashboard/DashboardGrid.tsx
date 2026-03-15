import { useState, useMemo, useCallback } from 'react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Plus, RotateCcw, Check, X, Trash2, GripVertical, Sparkles } from 'lucide-react';
import { Language } from '@/i18n/translations';
import { WidgetInstance, WIDGET_REGISTRY, generateWidgetId } from './widgetRegistry';
import { Button } from '@/components/ui/button';
import { WidgetLibrary } from './WidgetLibrary';

interface DashboardGridProps {
  layout: WidgetInstance[];
  onLayoutChange: (layout: WidgetInstance[]) => void;
  onReset: () => void;
  language: Language;
  renderWidget: (widget: WidgetInstance) => React.ReactNode;
}

export const DashboardGrid = ({ layout, onLayoutChange, onReset, language, renderWidget }: DashboardGridProps) => {
  const [editMode, setEditMode] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const { containerRef, width } = useContainerWidth({ initialWidth: 1280 });

  const gridLayout = useMemo(() => layout.map(w => {
    const def = WIDGET_REGISTRY[w.type];
    return {
      i: w.i,
      x: w.x,
      y: w.y,
      w: w.w,
      h: w.h,
      minW: def?.minW || 1,
      maxW: def?.maxW || 4,
      minH: def?.minH || 1,
      maxH: def?.maxH || 2,
      static: !editMode,
    };
  }), [layout, editMode]);

  const handleLayoutUpdate = useCallback((newGridLayout: readonly any[]) => {
    if (!editMode) return;
    const updated = layout.map(widget => {
      const gl = newGridLayout.find((g: any) => g.i === widget.i);
      if (gl) {
        return { ...widget, x: gl.x, y: gl.y, w: gl.w, h: gl.h };
      }
      return widget;
    });
    onLayoutChange(updated);
  }, [layout, editMode, onLayoutChange]);

  const addWidget = (type: string) => {
    const def = WIDGET_REGISTRY[type];
    if (!def) return;
    const newWidget: WidgetInstance = {
      i: generateWidgetId(),
      type,
      x: 0,
      y: Infinity,
      w: def.defaultW,
      h: def.defaultH,
    };
    onLayoutChange([...layout, newWidget]);
    setShowLibrary(false);
  };

  const removeWidget = (id: string) => {
    onLayoutChange(layout.filter(w => w.i !== id));
  };

  const exitEditMode = () => {
    setEditMode(false);
    setShowLibrary(false);
  };

  const activeTypes = new Set(layout.map(w => w.type));
  const availableWidgets = Object.values(WIDGET_REGISTRY).filter(w => !activeTypes.has(w.type));

  return (
    <div className="relative" ref={containerRef}>
      {/* Edit mode banner */}
      <AnimatePresence>
        {editMode && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="mb-4 bg-primary/5 border border-primary/20 rounded-2xl p-3 flex items-center justify-between flex-wrap gap-2"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {language === 'nl' ? 'Bewerkingsmodus' : language === 'fr' ? 'Mode édition' : 'Edit mode'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {language === 'nl' ? 'Sleep widgets om te herschikken · Versleep hoeken om formaat te wijzigen' : 'Drag widgets to rearrange · Resize from corners'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowLibrary(!showLibrary)} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                {language === 'nl' ? 'Widget toevoegen' : 'Add widget'}
              </Button>
              <Button size="sm" variant="outline" onClick={onReset} className="gap-1.5 text-muted-foreground">
                <RotateCcw className="w-3.5 h-3.5" />
                {language === 'nl' ? 'Herstel' : 'Reset'}
              </Button>
              <Button size="sm" onClick={exitEditMode} className="gap-1.5">
                <Check className="w-3.5 h-3.5" />
                {language === 'nl' ? 'Klaar' : 'Done'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Normal edit button */}
      {!editMode && (
        <div className="flex items-center justify-end mb-4">
          <Button size="sm" variant="ghost" onClick={() => setEditMode(true)} className="gap-1.5 text-muted-foreground hover:text-foreground">
            <Pencil className="w-3.5 h-3.5" />
            {language === 'nl' ? 'Dashboard bewerken' : 'Edit dashboard'}
          </Button>
        </div>
      )}

      {/* Widget library panel */}
      <AnimatePresence>
        {showLibrary && (
          <WidgetLibrary
            availableWidgets={availableWidgets}
            language={language}
            onAdd={addWidget}
            onClose={() => setShowLibrary(false)}
          />
        )}
      </AnimatePresence>

      {/* Grid */}
      <ResponsiveGridLayout
        className="layout"
        width={width}
        layouts={{ lg: gridLayout, md: gridLayout, sm: gridLayout.map(l => ({ ...l, w: Math.min(l.w, 2), x: l.x % 2 })) }}
        breakpoints={{ lg: 1024, md: 768, sm: 0 }}
        cols={{ lg: 4, md: 2, sm: 1 }}
        rowHeight={150}
        margin={[16, 16]}
        dragConfig={{ enabled: editMode, handle: '.widget-drag-handle' }}
        resizeConfig={{ enabled: editMode }}
        onLayoutChange={(currentLayout) => handleLayoutUpdate(currentLayout)}
      >
        {layout.map(widget => (
          <div key={widget.i} className="relative group">
            {editMode && (
              <>
                {/* Delete button */}
                <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => removeWidget(widget.i)}
                    className="w-7 h-7 rounded-lg bg-destructive/90 text-destructive-foreground flex items-center justify-center hover:bg-destructive transition-colors shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Drag handle - always visible in edit mode */}
                <div className="widget-drag-handle absolute top-2 left-2 z-20 w-7 h-7 rounded-lg bg-muted/90 text-muted-foreground flex items-center justify-center cursor-grab active:cursor-grabbing transition-opacity shadow-sm">
                  <GripVertical className="w-3.5 h-3.5" />
                </div>
              </>
            )}
            <div className={`w-full h-full transition-all duration-200 ${editMode ? 'ring-2 ring-primary/20 ring-dashed rounded-2xl scale-[0.98]' : ''}`}>
              {renderWidget(widget)}
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>

      {/* Empty state */}
      {layout.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 bg-card rounded-2xl border border-dashed border-border"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-primary" />
          </div>
          <p className="text-foreground font-medium mb-1">
            {language === 'nl' ? 'Je dashboard is leeg' : 'Your dashboard is empty'}
          </p>
          <p className="text-muted-foreground text-sm mb-4">
            {language === 'nl' ? 'Voeg widgets toe om je dashboard samen te stellen.' : 'Add widgets to build your dashboard.'}
          </p>
          <Button onClick={() => { setEditMode(true); setShowLibrary(true); }} className="gap-1.5">
            <Plus className="w-4 h-4" />
            {language === 'nl' ? 'Widgets toevoegen' : 'Add widgets'}
          </Button>
        </motion.div>
      )}
    </div>
  );
};
