import { notFound } from "next/navigation";
import { getProject } from "@/lib/content";
import { FocusShell } from "@/components/FocusShell";
import { ProjectBody } from "@/components/ProjectBody";

/**
 * The intercepted project view — the "ghost redirect".
 *
 * `(.)` intercepts a same-level navigation to /projects/[slug]. The home page
 * stays mounted underneath, so the shared layoutIds can carry the card into
 * this shell. A cold visit to the same URL bypasses this entirely and renders
 * app/projects/[slug]/page.tsx as a normal page.
 */
export default async function InterceptedProject({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project || project.draft) notFound();

  return (
    <FocusShell
      slug={project.slug}
      title={project.title}
      tagline={project.tagline}
    >
      <ProjectBody source={project.body} />
    </FocusShell>
  );
}
