import { forwardRef } from 'react';
import { ContractBlock, mergeFieldLabels } from '@/types/contract';

interface ContractPreviewProps {
  blocks: ContractBlock[];
  fieldValues: Record<string, string>;
  clubName?: string;
  clubLogoUrl?: string | null;
  clubOwnerName?: string | null;
  clubSignatureUrl?: string | null;
  volunteerName?: string;
  contractColors?: { primary: string; accent: string; bg: string };
  language?: 'nl' | 'fr' | 'en';
}

const ContractPreview = forwardRef<HTMLDivElement, ContractPreviewProps>(
  ({ blocks, fieldValues, clubName, clubLogoUrl, clubOwnerName, clubSignatureUrl, volunteerName, contractColors, language }, ref) => {
    const t3 = (nl: string, fr: string, en: string) => language === 'fr' ? fr : language === 'en' ? en : nl;
    const colors = contractColors || { primary: '#1a5632', accent: '#e8742e', bg: '#ffffff' };

    return (
      <div
        ref={ref}
        style={{
          padding: '48px 56px',
          minHeight: 1123,
          backgroundColor: colors.bg,
          width: 794,
          fontFamily: '"Plus Jakarta Sans", sans-serif',
        }}
      >
        {blocks.map(block => (
          <div key={block.id} data-block="true" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            {block.type === 'heading' && (
              <div style={{
                fontSize: block.style.fontSize,
                color: block.style.color || colors.primary,
                textAlign: block.style.textAlign,
                fontWeight: block.style.bold ? 'bold' : 'normal',
                fontStyle: block.style.italic ? 'italic' : 'normal',
                textDecoration: block.style.underline ? 'underline' : 'none',
                padding: '8px 4px',
                lineHeight: 1.3,
                fontFamily: '"Space Grotesk", sans-serif',
              }}>
                {block.content}
              </div>
            )}

            {block.type === 'text' && (
              <div
                dangerouslySetInnerHTML={{ __html: block.content }}
                style={{
                  fontSize: block.style.fontSize,
                  color: block.style.color,
                  textAlign: block.style.textAlign,
                  fontWeight: block.style.bold ? 'bold' : 'normal',
                  fontStyle: block.style.italic ? 'italic' : 'normal',
                  textDecoration: block.style.underline ? 'underline' : 'none',
                  padding: '6px 4px',
                  lineHeight: 1.6,
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                }}
              />
            )}

            {block.type === 'article' && (
              <div style={{
                padding: 12,
                borderRadius: 8,
                borderLeft: `3px solid ${colors.primary}`,
                backgroundColor: `${colors.primary}08`,
              }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: colors.primary, marginBottom: 4, fontFamily: '"Space Grotesk", sans-serif' }}>
                  {block.articleTitle}
                </p>
                <p style={{ fontSize: block.style.fontSize, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-line', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                  {block.content}
                </p>
                {block.note && (
                  <p style={{
                    color: colors.accent,
                    fontStyle: 'italic',
                    fontSize: 12,
                    borderTop: `1px dashed ${colors.primary}40`,
                    paddingTop: 8,
                    marginTop: 8,
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                  }}>
                    {block.note}
                  </p>
                )}
              </div>
            )}

            {block.type === 'field' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 4px', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                <span style={{ fontSize: 13, color: '#6b7280', minWidth: 140 }}>
                  {mergeFieldLabels[block.fieldName || ''] || block.fieldName}:
                </span>
                <div style={{
                  flex: 1,
                  borderBottom: '2px solid',
                  borderColor: `${colors.primary}40`,
                  padding: '4px 8px',
                  fontSize: 14,
                  color: '#1a1a1a',
                  fontWeight: 500,
                }}>
                  {fieldValues[block.fieldName || ''] || '—'}
                </div>
              </div>
            )}

            {block.type === 'logo' && (
              <div style={{ padding: '12px 0', textAlign: 'center' }}>
                {block.logoUrl ? (
                  <img src={block.logoUrl} alt="Logo" style={{ maxHeight: 96, objectFit: 'contain', display: 'inline-block' }} crossOrigin="anonymous" />
                ) : clubLogoUrl ? (
                  <img src={clubLogoUrl} alt="Club Logo" style={{ maxHeight: 96, objectFit: 'contain', display: 'inline-block' }} crossOrigin="anonymous" />
                ) : null}
              </div>
            )}

            {block.type === 'divider' && (
              <div style={{ padding: '8px 0' }}>
                <hr style={{ borderColor: `${colors.primary}30`, borderStyle: 'solid', borderWidth: '1px 0 0 0' }} />
              </div>
            )}

            {block.type === 'spacer' && <div style={{ height: 32 }} />}

            {block.type === 'signature' && (
              <div style={{ padding: '16px 4px' }}>
                <div style={{ display: 'flex', gap: 48 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                      {clubName || 'De organisatie'} — {clubOwnerName || 'Verantwoordelijke'}:
                    </p>
                    {clubSignatureUrl ? (
                      <div style={{ marginBottom: 8 }}>
                        <img src={clubSignatureUrl} alt="Handtekening organisatie" style={{ maxHeight: 64, objectFit: 'contain' }} crossOrigin="anonymous" />
                      </div>
                    ) : (
                      <>
                        <div style={{ marginBottom: 40 }} />
                        <div style={{ borderBottom: `2px solid ${colors.primary}`, width: '80%' }} />
                        <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                          {clubName || 'Naam'} + datum
                        </p>
                      </>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                      De vrijwilliger:
                    </p>
                    {/* DocuSeal embedded text tag - detected as interactive signature field */}
                    <p data-signature-field="true" style={{ fontSize: 8, color: '#d1d5db', marginBottom: 4, fontFamily: 'monospace' }}>
                      {'{{Handtekening;type=signature;role=First Party}}'}
                    </p>
                    <div style={{ marginBottom: 32 }} />
                    <div style={{ borderBottom: `2px solid ${colors.primary}`, width: '80%' }} />
                    <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                      {volunteerName || 'Naam'} + handtekening
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
);

ContractPreview.displayName = 'ContractPreview';
export default ContractPreview;
