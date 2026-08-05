// Ticket descriptions and comment bodies are stored as markdown (see
// server/migrations/002_teams_tickets.sql). Rendered with marked, then
// run through DOMPurify before ever reaching dangerouslySetInnerHTML -
// this content comes from other team members, not just yourself, so it
// has to be treated the same as any other untrusted HTML.
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ breaks: true, gfm: true });

export function renderMarkdown(source) {
  const html = marked.parse(source || '');
  return DOMPurify.sanitize(html);
}
