export { auth as middleware } from "./auth";
// The sync endpoint authenticates with CRON_SECRET, not a browser session.
export const config = { matcher: ["/((?!api/auth|api/cron/sync|login|_next|favicon.ico).*)"] };
