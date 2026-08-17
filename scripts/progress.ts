/**
 * Rebuilds the visual history.
 *
 * Checks out each milestone commit into a throwaway worktree, serves it, and
 * screenshots it — so `docs/progress/` holds what the site actually looked like
 * at each stage rather than a description of it.
 *
 * Dependencies are not installed per worktree. The worktree lives inside the
 * main checkout and has no `node_modules` of its own, so Node's ordinary upward
 * resolution finds the real one at the repo root. Every milestone below is
 * after `motion` was removed, so the dependency set is identical across all of
 * them. If a milestone earlier than that is ever added, that assumption breaks
 * and it will need its own install.
 *
 * Symlinking `node_modules` into the worktree does NOT work: Turbopack rejects
 * a symlink pointing outside its project root, whatever that root is set to.
 * Hence the upward-resolution trick, and hence `turbopack.root` being rewritten
 * to the repo root so the real `node_modules` sits inside it.
 *
 *   npx tsx scripts/progress.ts
 */
import { chromium } from "@playwright/test";
import { spawn, execSync, type ChildProcess } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "docs", "progress");
const WT = path.join(ROOT, ".progress-worktree");

interface Milestone {
  sha: string;
  slug: string;
  title: string;
  note: string;
  /** Focus a project as well as shooting the home page. */
  focus?: string;
}

const MILESTONES: Milestone[] = [
  {
    sha: "7e1321a",
    slug: "01-white-flank",
    title: "White page, flanking field",
    note: "First real layout. Name centred, About in the middle column, artefacts staggered down either side. Opening a project morphed a card into a separate panel.",
    focus: "proof-lens",
  },
  {
    sha: "876c5e0",
    slug: "02-expand-in-place",
    title: "One box, expanding in place",
    note: "The morph was scrapped. The artefact itself now grows, its corners travelling outward via clip-path — but still over the page, so About sat behind it.",
    focus: "proof-lens",
  },
  {
    sha: "5eb4f95",
    slug: "03-camera",
    title: "A camera, not a panel",
    note: "The page became a plane the camera moves. Neighbours keep their spatial relationship instead of being covered — but the artefact was still framed too wide, so About stayed occluded.",
    focus: "proof-lens",
  },
  {
    sha: "8e76b87",
    slug: "04-design-pass",
    title: "First design pass",
    note: "The first stage built while actually looking at the site. Metadata moved under the hero, stack became chips, and a close button that had been rendering at 2.3x on top of the tagline was fixed.",
    focus: "proof-lens",
  },
  {
    sha: "1f98e47",
    slug: "05-lattice",
    title: "The field arrives",
    note: "A lattice the page's contents deform. Still on white, and still competing with the reading.",
    focus: "proof-lens",
  },
  {
    sha: "f7d2430",
    slug: "06-deep-space",
    title: "Deep space",
    note: "Ground inverted to deep space blue with a starfield and nebulae. The dark app screenshots stopped fighting the page. The lattice no longer folds through itself.",
    focus: "melody",
  },
  {
    sha: "3e03731",
    slug: "07-choreography",
    title: "Choreography",
    note: "Every duration and curve moved into one motion language. The case study resolves in sequence behind the opening edge rather than arriving flat with it, hovering an artefact deepens its own well so the field forecasts the open, and the first load assembles the lattice instead of showing a loader.",
    focus: "proof-lens",
  },
];

const WIDTH = 1440;
const HEIGHT = 900;

function sh(command: string, cwd = ROOT): string {
  return execSync(command, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

async function waitForServer(url: string, timeoutMs = 90_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 700));
  }
  return false;
}

async function captureMilestone(m: Milestone, port: number): Promise<boolean> {
  console.log(`\n── ${m.slug} (${m.sha}) ${m.title}`);

  await rm(WT, { recursive: true, force: true });
  try {
    sh(`git worktree prune`);
    sh(`git worktree add --detach "${WT}" ${m.sha}`);
  } catch (e) {
    console.log(`   ! worktree failed: ${(e as Error).message.split("\n")[0]}`);
    return false;
  }

  // Point Turbopack at the repo root so the real node_modules is inside it.
  // Each milestone's own next.config.ts pins the root to its own directory,
  // which would make resolution fail. See the note at the top of this file.
  await writeFile(
    path.join(WT, "next.config.ts"),
    [
      'import type { NextConfig } from "next";',
      "const nextConfig: NextConfig = {",
      "  reactCompiler: true,",
      `  turbopack: { root: String.raw\`${ROOT}\` },`,
      "};",
      "export default nextConfig;",
      "",
    ].join("\n"),
  );

  let server: ChildProcess | null = null;
  try {
    // Node refuses to spawn a .cmd shim without a shell, and going through a
    // shell makes the child hard to kill reliably. Run Next's JS entry directly.
    server = spawn(
      process.execPath,
      [
        path.join(ROOT, "node_modules", "next", "dist", "bin", "next"),
        "dev",
        "-p",
        String(port),
      ],
      { cwd: WT, stdio: "ignore" },
    );

    const base = `http://localhost:${port}`;
    if (!(await waitForServer(base))) {
      console.log("   ! server never became ready");
      return false;
    }

    const browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { width: WIDTH, height: HEIGHT },
      deviceScaleFactor: 2,
    });

    // Warm the dev server first. On a cold Turbopack compile the first paint
    // arrives well before the page is interactive, and a click during that
    // window is silently dropped — which yields a "focused" screenshot of the
    // home page.
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1200);

    await page.screenshot({ path: path.join(OUT, `${m.slug}-home.png`) });
    console.log(`   ${m.slug}-home.png`);

    if (m.focus) {
      const link = page.locator(`a[href="/projects/${m.focus}"]`).first();
      if (await link.count()) {
        await link.click();
        try {
          await page.waitForURL(`**/projects/${m.focus}`, { timeout: 20_000 });
          await page.waitForTimeout(2000);
          await page.screenshot({
            path: path.join(OUT, `${m.slug}-focused.png`),
          });
          console.log(`   ${m.slug}-focused.png`);
        } catch {
          console.log(`   ! ${m.slug}: focus navigation never landed`);
        }
      }
    }

    await browser.close();
    return true;
  } catch (e) {
    console.log(`   ! ${(e as Error).message.split("\n")[0]}`);
    return false;
  } finally {
    if (server?.pid) {
      try {
        sh(`taskkill /PID ${server.pid} /T /F`);
      } catch {
        server.kill();
      }
    }
    await new Promise((r) => setTimeout(r, 800));
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const captured: Milestone[] = [];
  let port = 3200;
  for (const m of MILESTONES) {
    const ok = await captureMilestone(m, port++);
    if (ok) captured.push(m);
  }

  await rm(WT, { recursive: true, force: true });
  try {
    sh("git worktree prune");
  } catch {
    // nothing to prune
  }

  const lines: string[] = [
    "# Progress",
    "",
    "What the site actually looked like at each stage, rebuilt from git history",
    "by `npx tsx scripts/progress.ts`. Reasoning behind each move is in",
    "[`DECISIONS.md`](DECISIONS.md).",
    "",
    "Every image below is a real screenshot of that commit running, not a mockup.",
    "",
    "---",
    "",
  ];

  for (const m of captured) {
    lines.push(`## ${m.title}`, "", `\`${m.sha}\``, "", m.note, "");
    lines.push(`![${m.title} — home](progress/${m.slug}-home.png)`, "");
    if (m.focus && existsSync(path.join(OUT, `${m.slug}-focused.png`))) {
      lines.push(
        `![${m.title} — ${m.focus} open](progress/${m.slug}-focused.png)`,
        "",
      );
    }
    lines.push("---", "");
  }

  await writeFile(path.join(ROOT, "docs", "PROGRESS.md"), lines.join("\n"));
  console.log(`\nwrote docs/PROGRESS.md with ${captured.length} milestone(s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
