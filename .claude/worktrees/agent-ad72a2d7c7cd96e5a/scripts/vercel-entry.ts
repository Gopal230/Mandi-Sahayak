/**
 * Vercel serverless entrypoint.
 *
 * Wraps the same Express app (`server/src/app.ts`) that runs under
 * `server/src/index.ts` locally. `loadConfig` is called once per cold start,
 * mirroring what `index.ts`'s `main()` does before `app.listen` — everything
 * after that (route protection, domain/DB assertions) is a local dev/CI
 * safety net and is skipped here; run `npm run typecheck` / the migration
 * scripts before deploying instead.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadConfig } from '../server/src/core/config.ts';
import { buildApp } from '../server/src/app.ts';

let app: ReturnType<typeof buildApp> | null = null;
let initError: Error | null = null;

try {
  loadConfig();
  app = buildApp();
} catch (err) {
  initError = err instanceof Error ? err : new Error(String(err));
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (initError || !app) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        error: {
          code: 'CONFIG_ERROR',
          message: initError?.message || 'Server initialization failed',
        },
      }),
    );
    return;
  }
  app(req as never, res as never);
}
