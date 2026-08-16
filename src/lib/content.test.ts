import { describe, expect, it } from "vitest";
import { compile } from "@mdx-js/mdx";
import { getAllProjects, getProject, getProjectSlugs } from "./content";

/**
 * These guard the contract in docs/BRIEF.md §4: dropping an MDX file into
 * content/projects/ is the only step needed to add a project. If frontmatter
 * drifts from the schema, this fails loudly at test time rather than silently
 * dropping a project from the field.
 */
describe("project content", () => {
  const projects = getAllProjects();

  it("finds every project", () => {
    expect(projects.length).toBeGreaterThan(0);
  });

  it("validates all frontmatter against the schema", () => {
    // getAllProjects throws on invalid frontmatter, so reaching here is the
    // assertion. Verify the parsed shape survived.
    for (const project of projects) {
      expect(project.title).toBeTruthy();
      expect(project.tagline).toBeTruthy();
      expect(project.slug).toMatch(/^[a-z0-9-]+$/);
      expect(Number.isInteger(project.year)).toBe(true);
    }
  });

  it("sorts flagships first", () => {
    const firstNonFlagship = projects.findIndex((p) => !p.flagship);
    if (firstNonFlagship === -1) return;
    expect(projects.slice(firstNonFlagship).every((p) => !p.flagship)).toBe(
      true,
    );
  });

  it("has no duplicate slugs", () => {
    const slugs = getProjectSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("resolves each slug back to a project with a body", () => {
    for (const slug of getProjectSlugs()) {
      const project = getProject(slug);
      expect(project).toBeDefined();
      expect(project!.body.trim().length).toBeGreaterThan(0);
    }
  });

  // Catches MDX syntax errors at test time instead of at render time.
  // Prettier's markdown formatter has previously rewritten JSX expression
  // comments in MDX into `{/_ … _/}`, which is not parseable — hence
  // .prettierignore covering content/, and hence this test.
  it.each(projects.map((p) => p.slug))("compiles %s as valid MDX", async (slug) => {
    const project = getProject(slug)!;
    await expect(compile(project.body)).resolves.toBeDefined();
  });
});
