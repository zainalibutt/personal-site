/**
 * Default state of the modal slot: nothing.
 *
 * Required by the parallel-route setup — without it, a hard navigation to a
 * route that does not fill this slot would 404 instead of rendering empty.
 */
export default function Default() {
  return null;
}
