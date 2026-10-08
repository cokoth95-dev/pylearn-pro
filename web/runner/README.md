# Optional trusted Python grader (not used in browser practice mode)

The current no-cost mode runs practice checks in the learner's browser and does not save scores or award progress. This Modal service is an optional future route to trusted grading; do not deploy it or add its secrets while operating in browser practice mode. The Next.js submission endpoint is disabled unless `TRUSTED_GRADING_ENABLED=true` is set on the server.

If you later choose trusted hosted grading, the Next.js submission endpoint sends code and test input to this Modal app. Each test runs in a short-lived gVisor sandbox with outbound network access blocked, resource limits, a 3-second process limit, and bounded output.

## One-time setup

This requires a Modal account and a Modal API login in PowerShell. Modal's Starter plan currently lists $30/month in compute credits; usage beyond included credits is pay-as-you-go. Check the current [Modal pricing page](https://modal.com/pricing) and set a workspace budget before accepting public submissions.

1. Install Python 3.11 or newer if it is not installed.
2. From `D:\Projects\PYTHON CLASS\web`, install the runner package:

   ```powershell
   py -m pip install -r runner\requirements.txt
   ```

3. Sign in from the same PowerShell window:

   ```powershell
   modal setup
   ```

   This opens Modal's browser sign-in. Do not send the resulting token to anyone.

4. In Modal's dashboard, create a secret named `pylearn-runner-auth` with one value named `RUNNER_TOKEN`. Generate a random token locally (for example with Python's `secrets.token_urlsafe(32)`) and keep it private.
5. Deploy the runner:

   ```powershell
   modal deploy runner\modal_app.py
   ```

   Copy the `grade` endpoint URL shown by the CLI.

## Server environment

Set these only in the Next.js server environment (never prefix the secret names with `NEXT_PUBLIC_`):

```text
SUPABASE_SECRET_KEY=<from Supabase Dashboard → Settings → API Keys>
PYTHON_RUNNER_URL=<Modal grade endpoint URL>
PYTHON_RUNNER_TOKEN=<the same random token stored in the Modal secret>
```

For local development, add them to `web/.env.local`. For a hosted site, add them to its server environment settings. Supabase recommends its new secret key; the legacy `SUPABASE_SERVICE_ROLE_KEY` name is also accepted. These keys bypass database row security and must never be exposed to browser code, committed to Git, or pasted into chat.

The first authenticated grading request will return a setup error until the Supabase migrations have been applied and all three server values are set. The runner app does not store submissions; trusted scores and learner code are stored by the Next.js server in Supabase.
