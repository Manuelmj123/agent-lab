"use client";
import { useEffect, useState } from "react";
import { parseAICodePatch } from "@/lib/parseAICodePatch";

interface Task {
  id: number;
  title: string;
  description: string;
  repo: string;
  url: string;
  labels: string[];
}

type StepState = "idle" | "running" | "done" | "error";

interface StepStatuses {
  plan: StepState;
  code: StepState;
  pr: StepState;
  error?: string;
}

export default function TicketsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [plans, setPlans] = useState<Record<number, string>>({});
  const [codePatchesPretty, setCodePatchesPretty] = useState<Record<number, string>>({});
  const [prLinks, setPrLinks] = useState<Record<number, string>>({});
  const [generateLoading, setGenerateLoading] = useState<number | null>(null);
  const [statuses, setStatuses] = useState<Record<number, StepStatuses>>({});

  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => setTasks(data));
  }, []);

  const initStatusesForTask = (taskId: number) => {
    setStatuses((prev) => ({
      ...prev,
      [taskId]: { plan: "idle", code: "idle", pr: "idle" },
    }));
  };

  const setStepStatus = (taskId: number, step: keyof StepStatuses, state: StepState, error?: string) => {
    setStatuses((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [step]: state,
        ...(error ? { error } : {}),
      },
    }));
  };

  // ---- Step 1: Plan ----
  const handlePlan = async (task: Task) => {
    setStepStatus(task.id, "plan", "running");
    setPlans((prev) => ({ ...prev, [task.id]: "Generating plan..." }));

    const res = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });

    if (!res.ok) {
      const msg = `Plan failed (${res.status})`;
      setStepStatus(task.id, "plan", "error", msg);
      throw new Error(msg);
    }

    const data = await res.json();
    setPlans((prev) => ({ ...prev, [task.id]: data.plan }));
    setStepStatus(task.id, "plan", "done");
    return data.plan as string;
  };

  // ---- Step 2: Code ----
  const handleCode = async (task: Task) => {
    setStepStatus(task.id, "code", "running");
    setCodePatchesPretty((prev) => ({ ...prev, [task.id]: "Generating code..." }));

    const res = await fetch("/api/code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });

    if (!res.ok) {
      const msg = `Code generation failed (${res.status})`;
      setStepStatus(task.id, "code", "error", msg);
      throw new Error(msg);
    }

    const data = await res.json();

    // Normalize response
    const rawPatch = typeof data.codePatch === "string" ? data.codePatch : JSON.stringify(data.codePatch);
    const pretty =
      typeof data.codePatch === "string" ? data.codePatch : JSON.stringify(data.codePatch, null, 2);

    // What we'll actually pass to PR creation (fixes your PR bug)
    let parsedFiles: Array<{ path: string; content: string }>;
    try {
      const parsed = typeof rawPatch === "string" ? JSON.parse(rawPatch) : data.codePatch;
      parsedFiles = parsed?.files ?? [];
    } catch {
      parsedFiles = [{ path: "ai-output.txt", content: pretty }];
    }

    setCodePatchesPretty((prev) => ({ ...prev, [task.id]: pretty }));
    setStepStatus(task.id, "code", "done");

    return parsedFiles;
  };

  const handleCreatePR = async (task: Task, rawPatch: any, plan: string) => {
    try {
      setStepStatus(task.id, "pr", "running");
  
      const files = parseAICodePatch(rawPatch);
      console.log("FILES TO COMMIT:", files); // debug
  
      if (!files.length) throw new Error("No files extracted from AI patch.");
  
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
  
      if (!res.ok) {
        const details = await res.text().catch(() => "");
        const msg = `PR creation failed (${res.status})${details ? `: ${details}` : ""}`;
        setStepStatus(task.id, "pr", "error", msg);
        throw new Error(msg);
      }
  
      const data = await res.json();
      setPrLinks((prev) => ({ ...prev, [task.id]: data.prUrl }));
      setStepStatus(task.id, "pr", "done");
      return data.prUrl as string;
    } catch (err: any) {
      console.error("handleCreatePR error:", err);
      setStepStatus(task.id, "pr", "error", err.message || "Unknown error");
      throw err;
    }
  };
  
  

  // ---- Orchestrator ----
  const handleGenerate = async (task: Task) => {
    initStatusesForTask(task.id);
    setGenerateLoading(task.id);

    try {
      const plan = await handlePlan(task);
      const files = await handleCode(task);
      await handleCreatePR(task, files, plan);
    } catch (e: any) {
      console.error("Generate failed", e);
      // make sure an error bubble is visible somewhere
      setStatuses((prev) => ({
        ...prev,
        [task.id]: {
          ...(prev[task.id] ?? { plan: "idle", code: "idle", pr: "idle" }),
          error: e?.message ?? "Unexpected error",
        },
      }));
    } finally {
      setGenerateLoading(null);
    }
  };

  const Step = ({
    label,
    state,
  }: {
    label: string;
    state: StepState;
  }) => {
    const color =
      state === "done"
        ? "bg-green-500 border-green-500"
        : state === "running"
        ? "bg-blue-500 border-blue-500 animate-pulse"
        : state === "error"
        ? "bg-red-500 border-red-500"
        : "bg-gray-300 border-gray-300";

    const textColor =
      state === "done"
        ? "text-green-600"
        : state === "running"
        ? "text-blue-600"
        : state === "error"
        ? "text-red-600"
        : "text-gray-500";

    const statusText =
      state === "done"
        ? "✓"
        : state === "running"
        ? "…"
        : state === "error"
        ? "✕"
        : "";

    return (
      <div className="flex items-center space-x-2">
        <span className={`w-3 h-3 rounded-full border ${color}`} />
        <span className={`text-sm ${textColor}`}>
          {label} {statusText && <strong className="ml-1">{statusText}</strong>}
        </span>
      </div>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Tickets</h1>
      {tasks.length === 0 ? (
        <p>No tasks yet.</p>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const st = statuses[task.id] ?? { plan: "idle", code: "idle", pr: "idle" };
            return (
              <div key={task.id} className="p-4 rounded-xl border shadow">
                <h2 className="text-lg font-semibold">{task.title}</h2>
                <p className="text-gray-600">{task.description}</p>

                <button
                  onClick={() => handleGenerate(task)}
                  className="mt-2 px-4 py-2 text-sm bg-black text-white rounded hover:bg-gray-800"
                  disabled={generateLoading === task.id}
                >
                  {generateLoading === task.id ? "Generating..." : "Generate"}
                </button>

                {/* Visual progress */}
                <div className="mt-4 space-y-2">
                  <Step label="1. Plan" state={st.plan} />
                  <Step label="2. Code" state={st.code} />
                  <Step label="3. Pull Request" state={st.pr} />
                  {st.error && (
                    <div className="text-sm text-red-600 mt-2">
                      <strong>Error:</strong> {st.error}
                    </div>
                  )}
                </div>

                {plans[task.id] && (
                  <div className="mt-3 p-3 rounded bg-gray-100 text-sm whitespace-pre-line">
                    <strong>Plan:</strong> {plans[task.id]}
                  </div>
                )}

                {codePatchesPretty[task.id] && (
                  <div className="mt-3 p-3 rounded bg-gray-50 border text-sm">
                    <strong>Code Patch:</strong>
                    <pre className="whitespace-pre-wrap">
                      {codePatchesPretty[task.id]}
                    </pre>
                  </div>
                )}

                {prLinks[task.id] && (
                  <a
                    href={prLinks[task.id]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-2 text-blue-600 underline text-sm"
                  >
                    View Pull Request
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
