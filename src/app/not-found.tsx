import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh w-[min(40rem,calc(100%-3rem))] flex-col justify-center"
    >
      <h1 className="text-ink text-4xl">Nothing here</h1>
      <p className="text-muted mt-3">
        That page does not exist — which is at least unambiguous.
      </p>
      <Link
        href="/"
        className="text-accent mt-8 self-start underline underline-offset-4"
      >
        ← Back to the work
      </Link>
    </main>
  );
}
