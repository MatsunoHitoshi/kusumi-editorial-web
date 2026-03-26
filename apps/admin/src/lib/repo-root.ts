import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * `package.json` に `workspaces` があるディレクトリ（npm workspaces のルート）を探す。
 * `next dev` の cwd が `apps/admin` でもルートから `npm --workspace` を実行できるようにする。
 */
export function findNpmWorkspaceRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 12; i++) {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { workspaces?: unknown };
        if (pkg.workspaces != null) {
          return dir;
        }
      } catch {
        // ignore
      }
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return startDir;
}
