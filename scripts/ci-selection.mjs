import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// Prefer extra coverage over missing an indirect renderer dependency.
export function needsBrowserTests(paths) {
  if (!paths?.length) return true;
  if (
    paths.some((path) =>
      [".nvmrc", ".npmrc", "pnpm-workspace.yaml", "tsconfig.json"].includes(path),
    )
  )
    return true;
  return paths.some((path) =>
    /^(src\/(assets|data|i18n)\/|src\/lib\/og|scripts\/|tests\/og|\.github\/workflows\/|package\.json$|pnpm-lock\.yaml$|.*config\.)/.test(
      path,
    ),
  );
}

export function selectBrowserTests(base = process.env.CI_BASE_REF || "origin/main") {
  try {
    // Include committed changes and local staged/unstaged changes; --no-renames
    // exposes both paths of a rename, including deleted renderer inputs.
    const mergeBase = execFileSync("git", ["merge-base", base, "HEAD"], {
      encoding: "utf8",
    }).trim();
    const paths = execFileSync("git", ["diff", "--no-renames", "--name-only", "-z", mergeBase], {
      encoding: "utf8",
    })
      .split("\0")
      .filter(Boolean);
    paths.push(
      ...execFileSync("git", ["ls-files", "--others", "--exclude-standard", "-z"], {
        encoding: "utf8",
      })
        .split("\0")
        .filter(Boolean),
    );
    return needsBrowserTests(paths);
  } catch {
    return true;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(selectBrowserTests() ? "1" : "0");
}
