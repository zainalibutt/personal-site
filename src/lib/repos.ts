import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { getProjectSummaries, type ProjectSummary } from "./content";

/**
 * The public repository index.
 *
 * `content/repos.json` is a committed snapshot written by `npm run repos` —
 * see that script for why it is a snapshot and not a fetch. Validated on read
 * for the same reason the MDX frontmatter is: a derived file that has drifted
 * should fail the build loudly rather than render a half-empty list.
 */

const repoSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  url: z.url(),
  live: z.url().optional(),
  language: z.string().optional(),
  topics: z.array(z.string()).default([]),
  stars: z.number().int().nonnegative(),
  /** ISO date, day precision. */
  pushed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type Repo = z.infer<typeof repoSchema>;

const FILE = path.join(process.cwd(), "content", "repos.json");

function readRepos(): Repo[] {
  if (!fs.existsSync(FILE)) return [];

  const parsed = z
    .array(repoSchema)
    .safeParse(JSON.parse(fs.readFileSync(FILE, "utf8")));

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid content/repos.json:\n${issues}`);
  }

  return parsed.data;
}

/**
 * Everything public, in two groups.
 *
 * `written` is the work that has a case study on this site. `other` is
 * everything else that is public on GitHub — which is the half a visitor
 * currently has no way of knowing exists, because the field only shows what has
 * been written up.
 *
 * The split is derived from each project's own `repo` URL rather than from a
 * list, so a project that gains a case study leaves the second group by itself.
 */
export function getWorkIndex(): {
  written: ProjectSummary[];
  other: Repo[];
} {
  const written = getProjectSummaries();
  const claimed = new Set(
    written
      .map((p) => p.repo?.toLowerCase().replace(/\/$/, ""))
      .filter((url): url is string => Boolean(url)),
  );

  return {
    written,
    other: readRepos().filter(
      (r) => !claimed.has(r.url.toLowerCase().replace(/\/$/, "")),
    ),
  };
}
