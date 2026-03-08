import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';

/**
 * Hook to get translated content for user-generated text.
 * Returns the original text if no translation exists or if the source language matches.
 * Triggers AI translation via edge function when needed.
 */
export const useTranslatedContent = (
  sourceTable: string,
  sourceId: string | undefined,
  sourceField: string,
  originalText: string | null | undefined,
  targetLanguage: Language,
) => {
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sourceId || !originalText) {
      setTranslated(null);
      return;
    }

    let cancelled = false;

    const fetchTranslation = async () => {
      // Check cache first
      const { data: cached } = await supabase
        .from('content_translations')
        .select('translated_text, source_hash')
        .eq('source_table', sourceTable)
        .eq('source_id', sourceId)
        .eq('source_field', sourceField)
        .eq('target_language', targetLanguage)
        .maybeSingle();

      const currentHash = simpleHash(originalText);

      if (cached && cached.source_hash === currentHash) {
        if (!cancelled) setTranslated(cached.translated_text);
        return;
      }

      // Request translation from edge function
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('translate-content', {
          body: {
            source_table: sourceTable,
            source_id: sourceId,
            source_field: sourceField,
            text: originalText,
            target_language: targetLanguage,
          },
        });

        if (!error && data?.translated_text && !cancelled) {
          setTranslated(data.translated_text);
        }
      } catch {
        // Silently fail, show original
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTranslation();
    return () => { cancelled = true; };
  }, [sourceTable, sourceId, sourceField, originalText, targetLanguage]);

  return {
    text: translated || originalText || '',
    isTranslated: !!translated && translated !== originalText,
    loading,
  };
};

/** Simple hash for change detection */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}
