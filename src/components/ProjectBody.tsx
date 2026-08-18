import { MDXRemote } from "next-mdx-remote/rsc";
import type { MDXComponents } from "mdx/types";
import remarkGfm from "remark-gfm";

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

  /* Figures inside a case study. Constrained to the prose measure and given the
     same hairline as everything else, so a diagram reads as part of the writing
     rather than as an attachment to it. */
  img: (props) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img
      className="border-line mb-6 max-w-[68ch] rounded-xl border"
      loading="lazy"
      {...props}
    />
  ),

  /* Results tables. The page's rule is that data is set in the monospace and
     prose is not, so the cells are mono and the header labels carry the same
     uppercase tracking as the artefact metadata. Wrapped in its own scroller:
     a wide table must never widen the case-study column, which is measured
     against the centre spine. */
  table: (props) => (
    <div className="mb-6 max-w-[68ch] overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm" {...props} />
    </div>
  ),
  th: (props) => (
    <th
      className="border-line text-muted border-b px-3 py-2 font-mono text-[0.6875rem] font-normal tracking-[0.08em] uppercase"
      {...props}
    />
  ),
  td: (props) => (
    <td
      className="border-line/60 text-ink/85 border-b px-3 py-2 font-mono tabular-nums"
      {...props}
    />
  ),
};

export function ProjectBody({ source }: { source: string }) {
  return (
    <MDXRemote
      source={source}
      components={components}
      options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
    />
  );
}
