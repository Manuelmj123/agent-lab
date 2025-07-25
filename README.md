This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

# Agent-Lab: AI Task to GitHub PR Workflow

This project integrates **Next.js**, **Tailwind (ShadCN)**, and **GitHub Issues + Pull Requests** with AI agents.  
The system can:
1. Create **tickets/tasks** in the UI (from GitHub Issues).
2. Use an **AI Agent** to generate code based on these tasks.
3. Parse the AI-generated code (structured as JSON).
4. Create a **new branch**, **commit changes**, and **open a Pull Request** automatically via GitHub's API.
5. Allow you to approve or deny the PR.

---

## Key Features
- **Next.js (15.4.4)** frontend with Tailwind + ShadCN components.
- **`handleCreatePR`** on the frontend calls our `/api/pr` backend to create PRs.
- **Backend with GitHub App integration** using Octokit.
- **AI code parsing** (converting JSON output from AI into individual files).
- **Automatic PR creation** with branch handling (creates or updates `ai-task-{id}` branches).
- **Fallback safety:** If AI output is malformed, `ai-output.txt` is created.

---

## Project Workflow

### 1. AI Generates Code
The AI returns structured JSON:
```json
{
  "files": [
    {
      "path": "src/components/Sidebar.tsx",
      "content": "import React from 'react'; ..."
    },
    {
      "path": "src/app/page.tsx",
      "content": "import Sidebar from '../components/Sidebar'; ..."
    }
  ]
}
```

### 2. Parsing AI Output
We use `parseAICodePatch` to ensure valid file objects are extracted:
```ts
export function parseAICodePatch(rawPatch: any): FileChange[] {
  const raw = typeof rawPatch === "string" ? rawPatch : JSON.stringify(rawPatch, null, 2);
  const cleaned = raw.replace(/```json|```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.files && Array.isArray(parsed.files)) {
      return parsed.files.map((f: any, i: number) => ({
        path: f.path || `ai-file-${i}.txt`,
        content: typeof f.content === "string" ? f.content : JSON.stringify(f.content),
      }));
    }
  } catch (e) {
    console.warn("Failed to parse AI patch, fallback to ai-output.txt");
  }
  return [{ path: "ai-output.txt", content: raw }];
}
```

---

## 3. Frontend: handleCreatePR
The `handleCreatePR` function sends parsed files to the backend:
```ts
const handleCreatePR = async (task: Task, rawPatch: any, plan: string) => {
  const files = parseAICodePatch(rawPatch);
  const res = await fetch("/api/pr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      branchName: `ai-task-${task.id}`,
      commitMessage: `AI-generated code for #${task.id}`,
      files,
      plan,
    }),
  });
};
```

---

## 4. Backend: /api/pr/route.ts
The backend:
- Validates payload.
- Creates a new branch or updates existing one.
- Commits all files.
- Opens a Pull Request on GitHub.

Key code snippet:
```ts
const treeItems = await Promise.all(
  files.map(async (file) => {
    const blob = await octokit.git.createBlob({
      owner,
      repo,
      content: file.content,
      encoding: "utf-8",
    });
    return { path: file.path, mode: "100644", type: "blob", sha: blob.data.sha };
  })
);
```

---

## Requirements
- **GitHub App** with permissions:
  - Contents: Read & Write
  - Pull Requests: Read & Write
- **Environment variables**:
  ```
  GITHUB_REPO=your-username/agent-lab
  GITHUB_APP_ID=your_app_id
  GITHUB_APP_INSTALLATION_ID=installation_id
  GITHUB_APP_PRIVATE_KEY_PATH=./github-app-private-key.pem
  ```

---

## Summary
With these components:
- **Frontend** prepares tasks and triggers AI code generation.
- **`parseAICodePatch`** extracts real files.
- **Backend** (`/api/pr`) creates a PR with those files.

This ensures an **automated workflow from AI tasks → GitHub Pull Requests**.

---
