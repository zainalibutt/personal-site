import { MDXRemote } from "next-mdx-remote/rsc";
import type { MDXComponents } from "mdx/types";

/**
 * MDX renderer for case-study bodies. Styling lives here rather than in a
 * typography plugin so the warm type scale stays under our control.
 */
const components: MDXComponents = {
  h2: (props) => (
    <h2 className="text-ink mt-12 mb-4 text-2xl first:mt-0" {...props} />
  ),
  h3: (props) => <h3 className="text-ink mt-8 mb-3 text-xl" {...props} />,
  p: (props) => (
    <p
      className="text-ink/85 mb-4 max-w-[68ch] leading-relaxed text-pretty"
      {...props}
    />
  ),
  ul: (props) => (
    <ul
      className="text-ink/85 mb-4 max-w-[68ch] list-disc space-y-2 pl-5"
      {...props}
    />
  ),
  ol: (props) => (
    <ol
      className="text-ink/85 mb-4 max-w-[68ch] list-decimal space-y-2 pl-5"
      {...props}
    />
  ),
  li: (props) => <li className="leading-relaxed" {...props} />,
  strong: (props) => <strong className="text-ink font-semibold" {...props} />,
  a: (props) => (
    <a
      className="text-accent decoration-accent/40 hover:decoration-accent underline underline-offset-4"
      {...props}
    />
  ),
  code: (props) => (
    <code
      className="bg-surface rounded px-1.5 py-0.5 text-[0.9em]"
      {...props}
    />
  ),
};

export function ProjectBody({ source }: { source: string }) {
  return <MDXRemote source={source} components={components} />;
}
