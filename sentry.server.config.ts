import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  
  // Clean request payloads and extra data to prevent secret keys leaking to Sentry
  beforeSend(event) {
    if (event.request && event.request.headers) {
      // Scrub authorization and session/cookie headers
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
      delete event.request.headers["x-csrf-token"];
    }

    if (event.extra) {
      // Scrub potential API token leaks from context
      delete event.extra.vercelToken;
      delete event.extra.githubToken;
      delete event.extra.groqApiKey;
      delete event.extra.openrouterApiKey;
    }

    return event;
  },
});
