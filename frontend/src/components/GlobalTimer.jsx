import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import TimerConflictModal from "./TimerConflictModal";


export default function GlobalTimer() {
  const { user } = useAuth();
  const [runningLog, setRunningLog] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [error, setError] = useState("");
  const [conflictLog, setConflictLog] = useState(null);

  const fetchRunning = useCallback(async () => {
    try {
      const data = await api("/api/timelogs/running");
      if (data) {
        setRunningLog(data);
        localStorage.setItem("runningTimeLogId", String(data.id));
      } else {
        setRunningLog(null);
        localStorage.removeItem("runningTimeLogId");
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchRunning();
  }, [user, fetchRunning]);

  useEffect(() => {
    if (!runningLog) { setElapsed(0); return; }
    const update = () => {
      setElapsed(Math.floor((Date.now() - new Date(runningLog.startTime).getTime()) / 1000));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [runningLog]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const data = await api("/api/projects");
        setProjects(data);
      } catch {}
    })();
  }, [user]);

  useEffect(() => {
    if (!selectedProjectId) { setTasks([]); return; }
    (async () => {
      try {
        const data = await api(`/api/tasks?projectId=${selectedProjectId}`);
        setTasks(data.tasks || data);
      } catch {}
    })();
  }, [selectedProjectId]);

  const handleStart = async () => {
    if (!selectedProjectId) return;
    setError("");
    try {
      const data = await api("/api/timelogs/start", {
        method: "POST",
        body: JSON.stringify({
          projectId: Number(selectedProjectId),
          taskId: selectedTaskId ? Number(selectedTaskId) : undefined,
        }),
      });
      setRunningLog(data);
      localStorage.setItem("runningTimeLogId", String(data.id));
    } catch (err) {
      if (err.message.includes("already have a timer running")) {
        try {
          const run = await api("/api/timelogs/running");
          if (run) setConflictLog(run);
        } catch {}
      } else {
        setError(err.message);
        setTimeout(() => setError(""), 3000);
      }
    }
  };

  const handleStop = async (id) => {
    try {
      await api(`/api/timelogs/stop/${id}`, { method: "POST" });
      setRunningLog(null);
      localStorage.removeItem("runningTimeLogId");
      if (id && conflictLog?.id === id) {
        setConflictLog(null);
        handleStart();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStopConflict = async (id) => {
    await handleStop(id);
  };

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (!user) return null;

  return (
    <>
      <div className="flex items-center gap-2 text-sm">
        {runningLog ? (
          <>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold tabular-nums timer-tick">{formatTime(elapsed)}</span>
            <span className="text-muted-foreground text-xs truncate max-w-[80px] sm:max-w-[120px]">
              {runningLog.project?.name}{runningLog.taskId ? ` / ${runningLog.task?.title}` : ""}
            </span>
            <button
              onClick={() => handleStop(runningLog.id)}
              className="bg-destructive text-destructive-foreground px-2 py-0.5 rounded text-xs hover:opacity-90 btn-press"
              aria-label="Stop timer"
            >
              Stop
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <select
                value={selectedProjectId}
                onChange={(e) => { setSelectedProjectId(e.target.value); setSelectedTaskId(""); }}
                className="h-7 text-xs max-w-[110px] sm:max-w-[150px] rounded-md border border-input bg-background px-2 py-1"
                aria-label="Select project"
              >
                <option value="">Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                disabled={!selectedProjectId}
                className="h-7 text-xs max-w-[100px] sm:max-w-[130px] rounded-md border border-input bg-background px-2 py-1 disabled:opacity-50"
                aria-label="Select task"
              >
                <option value="">Task (opt)</option>
                {tasks.map((t) => (
                  <option key={t.id} value={String(t.id)}>{t.title}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleStart}
              disabled={!selectedProjectId}
              className="bg-emerald-600 text-white px-2 py-0.5 rounded text-xs hover:opacity-90 disabled:opacity-50 btn-press"
              aria-label="Start timer"
            >
              Start
            </button>
          </>
        )}
        {error && <span className="text-destructive text-xs">{error}</span>}
      </div>

      <TimerConflictModal
        open={!!conflictLog}
        runningLog={conflictLog}
        onStop={handleStopConflict}
        onCancel={() => setConflictLog(null)}
      />
    </>
  );
}
