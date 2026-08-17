import Link from "next/link";
import { SpacetimeField } from "@/components/SpacetimeField";

/**
 * A 404 that stays inside the world.
 *
 * The previous version rendered bare prose on a flat ground, so a mistyped URL
 * dropped the visitor out of the site entirely — which is the one thing the
 * camera model exists to avoid. The field renders here for the same reason an
 * intercepted route must never return `null`: leaving the world is worse than
 * arriving somewhere empty.
 */
export default function NotFound() {
  return (
    <>
      <SpacetimeField />

      <main
        id="main"
        className="relative mx-auto flex min-h-dvh w-[min(40rem,calc(100%-3rem))] flex-col justify-center"
      >
        <p className="text-muted font-mono text-xs tracking-[0.16em] uppercase">
          404
        </p>
        <h1 className="text-ink mt-4 text-5xl">Nothing here</h1>
        <p className="text-muted mt-4 max-w-[46ch] text-lg text-pretty">
          That page does not exist — which is at least unambiguous. Everything
          that does is one step back.
        </p>
        <Link
          href="/"
          className="text-accent hover:text-ink mt-10 self-start underline underline-offset-4 transition-colors"
        >
          ← Back to the work
        </Link>
      </main>
    </>
  );
}
