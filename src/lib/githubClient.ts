import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import fs from "fs";

export function createGitHubClient() {
  const privateKey = fs.readFileSync(process.env.GITHUB_APP_PRIVATE_KEY_PATH!, "utf8");

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID!,
      privateKey,
      installationId: process.env.GITHUB_APP_INSTALLATION_ID!,
    },
  });
}
