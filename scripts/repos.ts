/**
 * Snapshots the public GitHub repositories into `content/repos.json`.
 *
 * A snapshot rather than a live call, for two reasons that both matter.
 *
 * The CSP is `connect-src 'self'` — decision 19 — so the browser cannot reach
 * api.github.com at all, and loosening a real policy to populate a list would
 * be a bad trade. And fetching at build time instead would put every deployment
 * at the mercy of an unauthenticated API with a sixty-an-hour rate limit: the
 * build would go red for a reason that has nothing to do with the change being
 * deployed.
 *
 * So this is a committed derived artefact, refreshed by hand like the OG cards
 * and the generated figures:
 *
 *   npm run repos
 *
 * Forks are dropped — they are somebody else's work — and so is the profile
 * README repository, which is a file rather than a project.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";

const USER = "zainalibutt";
const OUT = path.join(process.cwd(), "content", "repos.json");

interface GitHubRepo {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  pushed_at: string;
  fork: boolean;
  archived: boolean;
}

async function main() {
  const response = await fetch(
    `https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`,
    { headers: { Accept: "application/vnd.github+json" } },
  );

  if (!response.ok) {
    throw new Error(
      `GitHub returned ${response.status} ${response.statusText}. ` +
        `Unauthenticated requests are limited to sixty an hour; try again later.`,
    );
  }

  const raw = (await response.json()) as GitHubRepo[];

  const repos = raw
    .filter((r) => !r.fork && !r.archived && r.name !== USER)
    .map((r) => ({
      name: r.name,
      description: r.description ?? "",
      url: r.html_url,
      live: r.homepage || undefined,
      language: r.language ?? undefined,
      topics: r.topics ?? [],
      stars: r.stargazers_count,
      pushed: r.pushed_at.slice(0, 10),
    }))
    /* Most recently pushed first. The API is asked for that order too, but
       sorting here as well means the file does not silently change shape if the
       query ever loses its parameter. */
    .sort((a, b) => b.pushed.localeCompare(a.pushed));

  await writeFile(OUT, `${JSON.stringify(repos, null, 2)}\n`, "utf8");
  console.log(`${repos.length} repositories -> content/repos.json`);
  for (const r of repos) console.log(`  ${r.name}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
