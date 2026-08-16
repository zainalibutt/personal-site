import { notFound } from "next/navigation";
import { getProject } from "@/lib/content";
import { FocusShell } from "@/components/FocusShell";
import { ProjectBody } from "@/components/ProjectBody";

/**
 * The intercepted project view — the "ghost redirect".
 *
 * `(.)` intercepts a same-level navigation to /projects/[slug]. The home page
 * stays mounted underneath, so the card's preview rect is still measurable and
 * the morph has somewhere to travel from. A cold visit bypasses this entirely
 * and renders app/projects/[slug]/page.tsx as a normal page.
 */
export default async function InterceptedProject({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project || project.draft) notFound();

  const { body, ...summary } = project;

  return (
    <FocusShell project={summary}>
      <ProjectBody source={body} />
    </FocusShell>
  );
}
