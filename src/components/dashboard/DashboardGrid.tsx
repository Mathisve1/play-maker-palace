import { useState, useMemo, useCallback } from 'react';
// @ts-ignore
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Plus, RotateCcw, Check, X, Trash2, GripVertical } from 'lucide-react';
import { Language } from '@/i18n/translations';
import { WidgetInstance, WIDGET_REGISTRY, generateWidgetId } from './widgetRegistry';
import { Button } from '@/components/ui/button';

const ResponsiveGridLayout = WidthProvider(Responsive);

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

  // Convert WidgetInstance[] to react-grid-layout Layout[]
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

  const handleLayoutUpdate = useCallback((newGridLayout: any[]) => {
    if (!editMode) return;
    const updated = layout.map(widget => {
      const gl = newGridLayout.find(g => g.i === widget.i);
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
      y: Infinity, // will be placed at bottom
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

  const categoryLabels: Record<string, Record<string, string>> = {
    kpi: { nl: 'KPI\'s', en: 'KPIs', fr: 'KPIs' },
    overview: { nl: 'Overzicht', en: 'Overview', fr: 'Aperçu' },
    shortcuts: { nl: 'Snelkoppelingen', en: 'Shortcuts', fr: 'Raccourcis' },
    activity: { nl: 'Activiteit', en: 'Activity', fr: 'Activité' },
  };

  return (
    <div className="relative">
      {/* Edit mode toolbar */}
      <div className="flex items-center justify-end gap-2 mb-4">
        {editMode ? (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setShowLibrary(!showLibrary)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              {language === 'nl' ? 'Widget toevoegen' : 'Add widget'}
            </Button>
            <Button size="sm" variant="outline" onClick={onReset} className="gap-1.5 text-muted-foreground">
              <RotateCcw className="w-3.5 h-3.5" />
              {language === 'nl' ? 'Herstel standaard' : 'Reset default'}
            </Button>
            <Button size="sm" onClick={exitEditMode} className="gap-1.5">
              <Check className="w-3.5 h-3.5" />
              {language === 'nl' ? 'Klaar' : 'Done'}
            </Button>
          </motion.div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setEditMode(true)} className="gap-1.5 text-muted-foreground hover:text-foreground">
            <Pencil className="w-3.5 h-3.5" />
            {language === 'nl' ? 'Dashboard bewerken' : 'Edit dashboard'}
          </Button>
        )}
      </div>

      {/* Widget library panel */}
      <AnimatePresence>
        {showLibrary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 bg-card rounded-2xl border border-border p-4 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">
                {language === 'nl' ? 'Widget bibliotheek' : 'Widget library'}
              </h3>
              <button onClick={() => setShowLibrary(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            {availableWidgets.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                {language === 'nl' ? 'Alle widgets zijn al toegevoegd.' : 'All widgets have been added.'}
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(
                  availableWidgets.reduce((acc, w) => {
                    if (!acc[w.category]) acc[w.category] = [];
                    acc[w.category].push(w);
                    return acc;
                  }, {} as Record<string, typeof availableWidgets>)
                ).map(([cat, widgets]) => (
                  <div key={cat}>
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5 tracking-wider">
                      {categoryLabels[cat]?.[language] || cat}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {widgets.map(w => (
                        <button
                          key={w.type}
                          onClick={() => addWidget(w.type)}
                          className="flex items-start gap-2.5 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
                        >
                          <Plus className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-foreground">{w.label[language] || w.label.en}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{w.description[language] || w.description.en}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: gridLayout, md: gridLayout, sm: gridLayout.map(l => ({ ...l, w: Math.min(l.w, 2), x: l.x % 2 })) }}
        breakpoints={{ lg: 1024, md: 768, sm: 0 }}
        cols={{ lg: 4, md: 2, sm: 1 }}
        rowHeight={140}
        margin={[16, 16]}
        isDraggable={editMode}
        isResizable={editMode}
        onLayoutChange={(currentLayout) => handleLayoutUpdate(currentLayout)}
        draggableHandle=".widget-drag-handle"
      >
        {layout.map(widget => (
          <div key={widget.i} className="relative group">
            {editMode && (
              <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => removeWidget(widget.i)}
                  className="w-7 h-7 rounded-lg bg-destructive/90 text-destructive-foreground flex items-center justify-center hover:bg-destructive transition-colors shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {editMode && (
              <div className="widget-drag-handle absolute top-2 left-2 z-20 w-7 h-7 rounded-lg bg-muted/80 text-muted-foreground flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-3.5 h-3.5" />
              </div>
            )}
            <div className={`w-full h-full ${editMode ? 'ring-2 ring-primary/20 ring-dashed rounded-2xl' : ''}`}>
              {renderWidget(widget)}
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>

      {/* Empty state */}
      {layout.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm mb-3">
            {language === 'nl' ? 'Je dashboard is leeg. Voeg widgets toe om te beginnen.' : 'Your dashboard is empty. Add widgets to get started.'}
          </p>
          <Button onClick={() => { setEditMode(true); setShowLibrary(true); }} className="gap-1.5">
            <Plus className="w-4 h-4" />
            {language === 'nl' ? 'Widgets toevoegen' : 'Add widgets'}
          </Button>
        </div>
      )}
    </div>
  );
};
