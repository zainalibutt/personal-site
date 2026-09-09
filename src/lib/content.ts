import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

/**
 * Content pipeline.
 *
 * Dropping a single `.mdx` file into `content/projects/` is the ONLY step
 * required to add a project — it produces the card, the route, the OG image
 * and the sitemap entry automatically. See docs/BRIEF.md §4. Do not introduce
 * a registry that has to be edited by hand.
 */

const CONTENT_DIR = path.join(process.cwd(), "content", "projects");

const previewSchema = z.object({
  /** `video` is the baseline; `demo` is reserved for the two flagships. */
  type: z.enum(["video", "image", "demo"]).default("image"),
  src: z.string().optional(),
  poster: z.string().optional(),
  alt: z.string().optional(),
  /**
   * `cover` crops to fill — right for landscape app screenshots. `contain`
   * letterboxes onto the dominant colour — right for portrait phone captures
   * like IOU, which cropping would destroy.
   */
  fit: z.enum(["cover", "contain"]).default("cover"),
  /**
   * Reserved before any media loads. The requirement is absolute: no layout
   * shift, no blank interval, no grey rectangles. See docs/ARCHITECTURE.md §2.7.
   */
  aspectRatio: z
    .string()
    .regex(/^\d+\s*\/\s*\d+$/, "expected a CSS ratio like '16 / 10'")
    .default("16 / 10"),
  /** Warm placeholder shown until media is ready. Never grey. */
  dominantColour: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "expected a six-digit hex colour")
    .default("#ddd0bc"),
});

export const frontmatterSchema = z.object({
  title: z.string().min(1),
  tagline: z.string().min(1),
  year: z.number().int(),
  role: z.string().min(1),
  stack: z.array(z.string()).default([]),
  /** Flagships lead the field and earn a bespoke interactive demo. */
  flagship: z.boolean().default(false),
  /** Lower sorts first. Flagships always sort above non-flagships. */
  order: z.number().int().default(100),
  repo: z.string().optional(),
  live: z.string().optional(),
  /**
   * One measured, checkable fact about the project, shown on the card at rest.
   *
   * The site's strongest evidence — the numbers and the named failure modes —
   * all lived at the bottom of a case study behind a click, so a reader doing a
   * first pass saw six taglines and no proof of anything. This is the one line
   * of that evidence that travels up onto the face of the card, and it is the
   * only text the phone springboard carries besides the title.
   *
   * Keep it short — roughly 34 characters. It sits under an 84px icon in a
   * two-column grid, and the fold guarantee is measured, not assumed.
   *
   * Optional on purpose: a project without an honest number should say nothing
   * rather than reach for one.
   */
  evidence: z.string().optional(),
  /**
   * Always present after parsing, so cards never lack loading primitives.
   * `prefault` (not `default`) so the inner field defaults are applied — zod
   * types `default` against the parsed output, which would demand every key.
   */
  preview: previewSchema.prefault({}),
  draft: z.boolean().default(false),
});

export type ProjectFrontmatter = z.infer<typeof frontmatterSchema>;

export type Project = ProjectFrontmatter & {
  slug: string;
  body: string;
};

/** A project without its MDX body — safe to pass to client components. */
export type ProjectSummary = Omit<Project, "body">;

function readProjectFile(filename: string): Project {
  const slug = filename.replace(/\.mdx$/, "");
  const raw = fs.readFileSync(path.join(CONTENT_DIR, filename), "utf8");
  const { data, content } = matter(raw);

  const parsed = frontmatterSchema.safeParse(data);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid frontmatter in content/projects/${filename}:\n${issues}`,
    );
  }

  return { ...parsed.data, slug, body: content };
}

export function getAllProjects({ includeDrafts = false } = {}): Project[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map(readProjectFile)
    .filter((p) => includeDrafts || !p.draft)
    .sort((a, b) => {
      if (a.flagship !== b.flagship) return a.flagship ? -1 : 1;
      if (a.order !== b.order) return a.order - b.order;
      return b.year - a.year;
    });
}

export function getProjectSummaries(): ProjectSummary[] {
  return getAllProjects().map(({ body: _body, ...summary }) => summary);
}

export function getProject(slug: string): Project | undefined {
  return getAllProjects({ includeDrafts: true }).find((p) => p.slug === slug);
}

export function getProjectSlugs(): string[] {
  return getAllProjects().map((p) => p.slug);
}
