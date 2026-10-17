# Account progress operations

Reading, mathematical experiments and shared URLs work without sign-in. Account marks require Sites-owned Sign in with ChatGPT. The Worker trusts only identity injected by Sites dispatch; browser input never selects the owner. Progress responses use private, no-store caching. Public WebMCP tools cannot read or change private marks.

The browser shows acknowledged marks and saves one change at a time. If confirmation is lost, use **Reload progress** before another change. Import and reset reject stale revisions. Reload before retrying a bulk change rather than overwriting another session's work.

In Practice, **Check this device for older marks** previews old local data. **Import older device marks** fills missing account marks while preserving existing account values and the original local bytes. No import happens automatically. JSON backups retain schemaVersion 1 and validated lesson IDs; a malformed backup changes nothing.

## Local work

Use Node24, `npm ci`, `npm run build`, then the project verification skill. Its owned Worker uses an isolated local D1 database, applies the committed migration and retains artifacts outside the repository. Its named fictional identities exercise owner isolation and recovery; they do not establish native ChatGPT authentication. `npm test` includes actual local D1 concurrency and API boundary checks.

For development, `npm run dev` uses the official Sites local identity mock. `npm start` runs the built Worker locally with state under ignored `.wrangler/state`. Before either preview, build once and apply each pending SQL migration in order, once per local database:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_minor_ben_parker.sql
```

Do not replay an applied migration. Local preview state and the verification skill's disposable D1 are separate. Keep local databases, browser sessions and identity fixtures out of Git and published archives.

## Publish and roll back

Preserve `.openai/hosting.json` project identity and the `DB` binding. Change `db/schema.ts`, generate and inspect migrations with `npm run db:generate`, then commit SQL and metadata. Append migrations after deployment; never rewrite applied SQL, snapshots or journal entries. Sites applies hosted migrations before uploading a Worker, even when a later deployment stage fails.

Publish the reviewed, merged source through the shared Sites workflow. Record the source commit, saved version, deployment result and previous deployed version. Verify anonymous reading and forged-identity rejection on the actual domain, then native sign-in, acknowledged save, fresh-session persistence and sign-out. Local fixture evidence cannot replace these hosted observations.

Restore the recorded prior Sites version when a release fails. Keep D1 and its migrations: rolling back the Worker does not undo database changes. Do not drop or recreate private progress to repair a deployment.
