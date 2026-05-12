# workers-scheduler

One Cron Trigger slot. Unlimited downstream Workers.

## How it works

A central Dispatcher Worker fires every minute, reads registered workers from KV,
and POSTs to each matching `/cron/trigger` endpoint. Downstream Workers use this
package to declare their schedules and handle dispatched calls.

---

## Deploying the dispatcher (one-time, fork this repo)

1. Fork this repository
2. Create a KV namespace:
   ```bash
   pnpm wrangler kv namespace create CRON_REGISTRY
   ```
3. Copy the namespace ID into `wrangler.toml`:
   ```toml
   [[kv_namespaces]]
   binding = "CRON_REGISTRY"
   id = "YOUR_NAMESPACE_ID"
   ```
4. Commit and push `wrangler.toml`
5. In your fork → Settings → Secrets and variables:
   - **Secret:** `CLOUDFLARE_API_TOKEN`
   - **Variable:** `CLOUDFLARE_ACCOUNT_ID`
6. Push to `main` — GitHub Actions deploys automatically

---

## Integrating downstream Workers

**Install:**
```bash
pnpm add workers-scheduler
```

**Declare handlers:**
```ts
import { defineCronHandlers } from 'workers-scheduler/client'

const cronHandlers = defineCronHandlers({
  '0 * * * *': async (env) => {
    await syncData(env)
  },
  '0 8 * * *': async (env) => {
    await sendDigest(env)
  },
})

export default {
  async fetch(request, env, ctx) {
    return cronHandlers.handleRequest(request, env, ctx)
  },
}
```

**Set environment variables on the downstream Worker:**

| Variable | Value |
|----------|-------|
| `CRON_DISPATCHER_URL` | Your dispatcher Worker URL |
| `CRON_SECRET` | A shared secret (generate with `openssl rand -hex 32`) |
| `CRON_WORKER_URL` | This Worker's own URL |

**Register after each deploy (add to CI/CD pipeline):**
```bash
pnpm workers-scheduler register \
  --worker-url https://your-worker.workers.dev \
  --dispatcher-url https://workers-scheduler-dispatcher.your-subdomain.workers.dev \
  --secret $CRON_SECRET
```
