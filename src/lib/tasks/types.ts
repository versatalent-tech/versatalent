/**
 * "Your tasks" for people outside the CRM: road managers (dashboard) and
 * talents (portal). No imports: shared by the API and the pages.
 */
export interface MyTask {
  id: string;
  subject: string;
  /** Where it came from, e.g. "From the meeting “Weekly Meeting DJs”" (team only) */
  source: string | null;
  due_at: string | null;
  completed_at: string | null;
  added_by: string | null;
}
