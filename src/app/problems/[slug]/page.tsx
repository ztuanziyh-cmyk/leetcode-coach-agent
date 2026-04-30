import { PageShell } from "@/components/page-shell";
import { ProblemDetailContent } from "@/components/problem-detail-content";
import { getProblemDetail } from "@/lib/review-logic";

type ProblemDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProblemDetailPage({ params }: ProblemDetailPageProps) {
  const { slug } = await params;
  const detail = getProblemDetail(slug);
  const title = detail?.problem.title ?? slug.replaceAll("-", " ");

  return (
    <PageShell
      eyebrow="Problem Review"
      title={title}
      description="Mock problem detail remains intact, and synced-only problems can now render a lightweight read-only detail view from local submission data."
    >
      <ProblemDetailContent slug={slug} mockDetail={detail} />
    </PageShell>
  );
}
