/**
 * AI meeting notes are switched on by setting ANTHROPIC_API_KEY on the site
 * (Netlify: Functions scope). Without it, meetings, transcripts and notes
 * work as normal and the "Draft with Claude" option is hidden.
 */
export function aiNotesEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
