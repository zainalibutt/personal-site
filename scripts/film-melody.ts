/**
 * Melody card preview.
 *
 * Melody needs no account, so the film is simply the terminal being used: the
 * workspace settles with real delayed quotes, a command is typed into the bar,
 * and the chart panel it opens draws from live data.
 *
 * The command bar is the whole argument — this is a keyboard-first research
 * terminal, not a dashboard — so the shot spends its middle on the typing
 * rather than cutting straight to the result.
 *
 *   npm run film:melody
 *
 * Every number on screen is whatever the providers returned during the take.
 * Alpha Vantage and SEC EDGAR are live, so no two takes are identical and none
 * of them are dressed.
 */
import { film } from "./film-lib";

async function main() {
  await film({
    slug: "melody",
    url: "https://melody-terminal.vercel.app",
    viewport: { width: 900, height: 506 },
    /* The workspace once its providers have answered. Frame 0 is a grid of
       "Loading…" placeholders, which is an honest state but a poor one to
       leave a card resting on. */
    posterAt: 3.0,
    async scene(s) {
      /* Quote, overview, news and the watchlist all resolve over the network.
         Filming through that is the point — the panels fill with real figures
         rather than appearing already full. */
      await s.hold(3200);

      await s.click("#terminal-command", 700);
      await s.hold(400);

      /* Slower than the harness default. The command is the thing being
         demonstrated, so it has to be readable at card size as it is typed. */
      await s.type("AAPL G", 105);
      await s.hold(600);

      await s.page.keyboard.press("Enter");

      /* The chart panel mounts at the top of the workspace and becomes the
         active one. Waiting on the heading rather than a fixed delay, because
         Alpha Vantage's latency is not ours to predict. */
      await s.page.waitForSelector("text=AAPL Chart", { timeout: 30_000 });
      await s.hold(900);

      /* The canvas, not the panel. Framing the panel puts its title bar in the
         middle of the shot and the chart itself below the fold — which is the
         one thing the command was run to produce. */
      await s.scrollTo(".panel-shell-active canvas", 1100);
      await s.hold(3600);
    },
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
