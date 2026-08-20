"use client";

import { useRef } from "react";
import Image from "next/image";

/**
 * The portrait, and the same portrait enlarged.
 *
 * People tap a face expecting it to open — the behaviour every profile picture
 * they have ever used has — and a portrait that does nothing reads as an image
 * that failed to be a link.
 *
 * A native `<dialog>` carries this rather than a positioned overlay. The top
 * layer is outside the document flow, so it is not dragged around by the
 * transform on `[data-plane]`; Esc, the focus trap and inerting the page
 * behind all arrive with the element. See the note in globals.css.
 */
export function Portrait({
  src,
  alt,
  size = 96,
}: {
  src: string;
  alt: string;
  /** Rendered size at rest. The enlarged copy is served at its own width. */
  size?: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        /* The image already carries the name, so the control says what it
           does rather than repeating it. */
        aria-label="View portrait larger"
        className="portrait-trigger border-line shrink-0 border"
        style={{ width: size, height: size }}
      >
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          priority
          className="h-full w-full rounded-full object-cover"
        />
      </button>

      <dialog
        ref={dialog}
        className="portrait-modal"
        /* Clicking the backdrop closes it. The dialog's own box is the event
           target only when the click landed outside the content, because the
           image fills it — so this cannot swallow a click on the picture. */
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
      >
        {/* No `sizes`: the width prop already drives the srcSet, and a fixed
            `sizes` had Next requesting a 3840px variant of a 671px source. */}
        <Image src={src} alt={alt} width={671} height={835} />
      </dialog>
    </>
  );
}
