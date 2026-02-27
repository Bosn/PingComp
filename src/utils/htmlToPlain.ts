// Minimal HTML -> plain text derivation for Interviews v1.
// Scope freeze: store transcript as HTML; derive transcriptPlain for search/export.

const decodeEntities = (s: string) =>
  s
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");

export function htmlToPlain(html: string): string {
  const raw = String(html || '');
  if (!raw.trim()) return '';

  // Normalize newlines for common block/line-break elements.
  let s = raw;
  s = s.replace(/<\s*br\s*\/?>/gi, '\n');
  s = s.replace(/<\s*\/(p|div|li|tr|h\d)\s*>/gi, '\n');
  s = s.replace(/<\s*(p|div|li|tr|h\d)(\s+[^>]*)?>/gi, '');

  // Drop the rest tags.
  s = s.replace(/<[^>]+>/g, '');

  // Decode basic entities.
  s = decodeEntities(s);

  // Normalize whitespace.
  s = s.replace(/\r\n/g, '\n');
  s = s.replace(/[ \t\f\v]+/g, ' ');
  s = s.replace(/\n\s+\n/g, '\n\n');
  s = s.replace(/\n{3,}/g, '\n\n');

  return s.trim();
}
