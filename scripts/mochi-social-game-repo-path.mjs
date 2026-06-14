import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

export function resolveMochiSocialGameRepoPath(root, env = process.env) {
  const configured = String(env.MOCHI_SOCIAL_GAME_REPO_PATH || "").trim();
  if (configured) return resolve(root, configured);

  const candidates = [
    resolve(root, "../Mochi Social"),
    resolve(root, "../Local RPG")
  ];
  return candidates.find((candidate) => existsSync(candidate)) || candidates[0];
}

export function resolveMochiSocialGameNodeModuleDirs(root, env = process.env) {
  const configured = String(env.MOCHI_SOCIAL_PLAYWRIGHT_MODULE_DIR || "").trim();
  const gameRepoPath = resolveMochiSocialGameRepoPath(root, env);
  return [
    configured,
    join(gameRepoPath, "node_modules")
  ].filter(Boolean);
}
