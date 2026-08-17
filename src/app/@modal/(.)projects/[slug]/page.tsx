import { notFound } from "next/navigation";
import { getProject } from "@/lib/content";

/**
 * Intercepts an in-session navigation to /projects/[slug] and renders nothing.
 *
 * That is the whole job. The interception keeps the home page mounted so the
 * URL can change without unmounting the field — and the artefact itself, which
 * is already in the field, reads the route and expands in place. There is no
 * second element to render; that was the old shared-element approach and it is
 * exactly what "not a new artefact" ruled out.
 *
 * A cold visit bypasses this and renders app/projects/[slug]/page.tsx normally.
 */
export default async function InterceptedProject({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project || project.draft) notFound();

  // Renders an inert marker rather than `null`: an empty slot makes the router
  // drop the intercepted branch and unmount the field underneath it.
  return <div data-intercepted={slug} hidden />;
}
