// Stripe webhook entry point. The handler lives in handler.ts so the tests
// can drive it without starting a server.
import { handleWebhook } from './handler.ts';

Deno.serve(handleWebhook);
