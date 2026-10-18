import { MainLayout } from '@/components/layout/MainLayout';
import { getProgrammeSettings } from '@/lib/db/repositories/membership';

/** Shared frame for the membership terms and privacy notice, with a draft banner until approved */
export async function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  const settings = await getProgrammeSettings().catch(() => null);
  const draft = !settings || settings.terms_version.includes('draft');
  return (
    <MainLayout>
      <section className="bg-white py-12">
        <article className="prose-legal container mx-auto max-w-3xl space-y-6 px-4 text-gray-800 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed [&_ul]:space-y-1">
          {draft && (
            <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Draft for review: these terms are not yet in force.
            </p>
          )}
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-sm text-gray-500">Last updated {updated}</p>
          {children}
        </article>
      </section>
    </MainLayout>
  );
}
