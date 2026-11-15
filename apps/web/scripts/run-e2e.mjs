import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const web = fileURLToPath(new URL("..", import.meta.url));
const api = resolve(web, "../api");
const databaseUrl = process.env.E2E_DATABASE_URL;
if (
  !databaseUrl ||
  !/(^|[_-])(tests?|e2e)([_-]|$)/i.test(new URL(databaseUrl).pathname.slice(1))
) {
  throw new Error(
    "Set E2E_DATABASE_URL to a dedicated PostgreSQL test/e2e database before running.",
  );
}
const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  NEXT_PUBLIC_API_URL: process.env.E2E_API_URL || "http://127.0.0.1:3101",
  NEXT_PUBLIC_USE_MOCK: "false",
  NEXT_TELEMETRY_DISABLED: "1",
  NODE_OPTIONS:
    process.env.NODE_OPTIONS ||
    "--max-old-space-size=768 --max-semi-space-size=4",
};
function run(cwd, entry, args) {
  const result = spawnSync(process.execPath, [resolve(cwd, entry), ...args], {
    cwd,
    env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

run(api, "node_modules/prisma/build/index.js", ["generate"]);
run(api, "node_modules/prisma/build/index.js", ["migrate", "deploy"]);
run(api, "node_modules/@nestjs/cli/bin/nest.js", ["build"]);
run(web, "node_modules/next/dist/bin/next", ["build", "--webpack"]);
run(web, "node_modules/@playwright/test/cli.js", [
  "test",
  ...process.argv.slice(2),
]);
