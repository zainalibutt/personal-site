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
  type: z.enum(["video", "image", "demo"]),
  src: z.string().optional(),
  poster: z.string().optional(),
  alt: z.string().optional(),
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
  preview: previewSchema.optional(),
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
