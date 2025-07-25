import { NextRequest, NextResponse } from "next/server";
import { createGitHubClient } from "@/lib/githubClient";

type FileChange = { path: string; content: any };

function stripCodeFences(content: any) {
  if (typeof content !== "string") {
    return JSON.stringify(content, null, 2);
  }
  return content.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "");
}

function sanitizePath(p: string) {
  let safe = (p || "").replace(/^\//, "");
  if (!safe) throw new Error("Empty path");
  if (safe.includes("..")) throw new Error(`Unsafe path detected: ${p}`);
  return safe;
}

// If you accidentally send one ai-output.txt that *itself* contains the {files:[]} JSON,
// try to unpack it server-side.
function tryServerSideUnpack(files: FileChange[]): FileChange[] {
  if (
    files.length === 1 &&
    typeof files[0].content === "string" &&
    files[0].path.toLowerCase().includes("ai-output")
  ) {
    const raw = files[0].content.replace(/```json|```/g, "").trim();
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.files)) {
        return parsed.files.map((f: any, i: number) => ({
          path: typeof f?.path === "string" ? f.path : `ai-file-${i}.txt`,
          content:
            typeof f?.content === "string"
              ? f.content
              : JSON.stringify(f?.content ?? "", null, 2),
      }));
      }
      if (
        Array.isArray(parsed) &&
        parsed.every((x: any) => x && typeof x.path === "string")
      ) {
        return parsed.map((f: any, i: number) => ({
          path: f.path,
          content:
            typeof f.content === "string"
              ? f.content
              : JSON.stringify(f.content ?? "", null, 2),
        }));
      }
    } catch {
      // ignore
    }
  }
  return files;
}

export async function POST(req: NextRequest) {
  try {
    let { branchName, commitMessage, files, plan } = await req.json();

    if (!branchName || typeof branchName !== "string") {
      return NextResponse.json({ error: "branchName is required" }, { status: 400 });
    }
    if (!commitMessage || typeof commitMessage !== "string") {
      return NextResponse.json({ error: "commitMessage is required" }, { status: 400 });
    }
    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "files[] is required and must be non-empty" }, { status: 400 });
    }

    // Auto-unpack if needed
    files = tryServerSideUnpack(files);

    const repoFull = process.env.GITHUB_REPO;
    if (!repoFull) {
      return NextResponse.json({ error: "GITHUB_REPO env var missing" }, { status: 500 });
    }
    const [owner, repo] = repoFull.split("/");
    if (!owner || !repo) {
      return NextResponse.json({ error: "GITHUB_REPO must be owner/repo" }, { status: 500 });
    }

    const octokit = createGitHubClient();

    // 0) Resolve default branch dynamically
    const repoInfo = await octokit.repos.get({ owner, repo });
    const defaultBranch = repoInfo.data.default_branch || "main";

    // 1) Get SHA of default branch HEAD commit
    const baseRef = await octokit.git.getRef({ owner, repo, ref: `heads/${defaultBranch}` });
    const baseSha = baseRef.data.object.sha;

    // 2) Get tree SHA from that commit
    const baseCommit = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: baseSha,
    });
    const baseTreeSha = baseCommit.data.tree.sha;

    // 3) Create or update the branch
    const headsRef = `heads/${branchName}`;
    const fullRef = `refs/${headsRef}`;

    let branchExists = true;
    try {
      await octokit.git.getRef({ owner, repo, ref: headsRef });
    } catch (e: any) {
      if (e.status === 404) {
        branchExists = false;
      } else {
        console.error("getRef failed:", e.response?.data || e);
        throw e;
      }
    }

    if (!branchExists) {
      await octokit.git.createRef({
        owner,
        repo,
        ref: fullRef,
        sha: baseSha,
      });
    } else {
      await octokit.git.updateRef({
        owner,
        repo,
        ref: headsRef,
        sha: baseSha,
        force: true,
      });
    }

    // 4) Create blobs for each file
    const treeItems = await Promise.all(
      (files as FileChange[]).map(async (file, index) => {
        const safePath = sanitizePath(file.path ?? `ai-file-${index}.txt`);
        const cleaned = stripCodeFences(file.content);

        console.log(`Creating blob for: ${safePath} (type: ${typeof file.content})`);

        const blob = await octokit.git.createBlob({
          owner,
          repo,
          content: cleaned,
          encoding: "utf-8",
        });

        return {
          path: safePath,
          mode: "100644",
          type: "blob" as const,
          sha: blob.data.sha,
        };
      })
    );

    // 5) Create a new tree
    const newTree = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: treeItems,
    });

    // 6) Create a commit pointing to the new tree
    const newCommit = await octokit.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: newTree.data.sha,
      parents: [baseSha],
    });

    // 7) Update branch to point to the new commit
    await octokit.git.updateRef({
      owner,
      repo,
      ref: headsRef,
      sha: newCommit.data.sha,
      force: true,
    });

    // 8) Create the PR
    const pr = await octokit.pulls.create({
      owner,
      repo,
      title: commitMessage,
      head: branchName,
      base: defaultBranch,
      body: `### AI Plan\n\n${plan ?? "_(no plan provided)_"}`,
    });

    return NextResponse.json({
      prUrl: pr.data.html_url,
      prNumber: pr.data.number,
      branchName,
      commitSha: newCommit.data.sha,
    });
  } catch (error: any) {
    console.error("PR creation failed (raw):", error);
    console.error("PR creation failed (response):", error?.response?.data);
    console.error("PR creation failed (message):", error?.message);
    return NextResponse.json(
      {
        error: "PR creation failed.",
        details: error?.response?.data || error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
