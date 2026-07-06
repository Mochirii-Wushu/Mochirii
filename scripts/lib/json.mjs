import { readText } from "./repo-paths.mjs";

export function readJsonFile(repoPath) {
  try {
    return JSON.parse(readText(repoPath));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${repoPath}: ${message}`);
  }
}
