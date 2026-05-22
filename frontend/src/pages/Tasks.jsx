import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent,
} from "@/components/ui/sheet";
import TaskPanel from "../components/TaskPanel";
import EmptyState, { TaskEmptyIcon } from "../components/EmptyState";
import { KanbanColumnSkeleton } from "../components/Skeleton";

const STATUSES = ["PLANNING", "ONGOING", "HOLD", "COMPLETED", "DECLINED"];
const STATUS_LABELS = {
  PLANNING: "Planning", ONGOING: "Ongoing", HOLD: "Hold",
  COMPLETED: "Completed", DECLINED: "Declined",
};
const STATUS_BADGE = {
  PLANNING: "badge-glass",
  ONGOING: "badge-glass",
  HOLD: "badge-glass-warning",
  COMPLETED: "badge-glass-success",
  DECLINED: "badge-glass-destructive",
};
const DOT_COLORS = {
  PLANNING: "var(--chart-1)", ONGOING: "var(--chart-1)", HOLD: "#f59e0b",
  COMPLETED: "#10b981", DECLINED: "#ef4444",
};
const PRIORITY_BADGE = { HIGH: "destructive", MEDIUM: "secondary", LOW: "outline" };

const PAGE_SIZE = 20;

const emptyForm = { title: "", description: "", priority: "MEDIUM", dueDate: "" };

export default function Tasks() {
  const { isFreelancer } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filterClientId, setFilterClientId] = useState("");
  const [filterProjectId, setFilterProjectId] = useState("");
  const [filterStatuses, setFilterStatuses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [mobileColumn, setMobileColumn] = useState("PLANNING");
  const [form, setForm] = useState({ ...emptyForm });
  const [createProjectId, setCreateProjectId] = useState("");
  const taskRefs = useRef({});

  const derivedClients = useMemo(() => {
    const map = new Map();
    projects.forEach((p) => { if (p.client) map.set(p.client.id, p.client); });
    return Array.from(map.values());
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (!filterClientId) return projects;
    return projects.filter((p) => p.client?.id === Number(filterClientId));
  }, [projects, filterClientId]);

  const fetchProjects = useCallback(async () => {
    try { setProjects(await api("/api/projects")); } catch {}
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      if (filterClientId) params.set("clientId", filterClientId);
      if (filterProjectId) params.set("projectId", filterProjectId);
      if (filterStatuses.length > 0) params.set("status", filterStatuses.join(","));
      const data = await api(`/api/tasks?${params}`);
      setTasks(data.tasks);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, filterClientId, filterProjectId, filterStatuses]);

  useEffect(() => { fetchProjects(); }, []);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { setPage(1); }, [filterClientId, filterProjectId, filterStatuses]);

  const handleQuickStatus = async (taskId, status) => {
    try {
      await api(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({ status }) });
      fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createProjectId) return;
    try {
      await api("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ ...form, projectId: Number(createProjectId), dueDate: form.dueDate || undefined }),
      });
      setOpen(false);
      setForm({ ...emptyForm });
      setCreateProjectId("");
      fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDragStart = (e, task) => {
    e.dataTransfer.setData("taskId", String(task.id));
    e.currentTarget.style.opacity = "0.5";
  };
  const handleDragEnd = (e) => { e.currentTarget.style.opacity = "1"; };
  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    const taskId = Number(e.dataTransfer.getData("taskId"));
    try {
      await api(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({ status: newStatus }) });
      fetchTasks();
    } catch (err) { setError(err.message); }
  };
  const handleDelete = async (id) => {
    if (!confirm("Delete this task?")) return;
    try { await api(`/api/tasks/${id}`, { method: "DELETE" }); fetchTasks(); }
    catch (err) { setError(err.message); }
  };
  const handleKeyboardMove = async (taskId, direction) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const idx = STATUSES.indexOf(task.status);
    const newIdx = direction === "next" ? Math.min(idx + 1, STATUSES.length - 1) : Math.max(idx - 1, 0);
    if (newIdx === idx) return;
    try {
      await api(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({ status: STATUSES[newIdx] }) });
      fetchTasks();
      setTimeout(() => { const el = taskRefs.current[taskId]; if (el) el.focus(); }, 100);
    } catch {}
  };
  const handleKeyboardKeyDown = (e, task) => {
    if (e.key === "Enter") setSelectedTask(task);
    else if (e.key === "ArrowRight") { e.preventDefault(); handleKeyboardMove(task.id, "next"); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); handleKeyboardMove(task.id, "prev"); }
  };

  const toggleStatusFilter = (s) => {
    setFilterStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <Button onClick={() => setOpen(true)} className="btn-press">New Task</Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Client</label>
          <select
            value={filterClientId}
            onChange={(e) => { setFilterClientId(e.target.value); setFilterProjectId(""); }}
            className="h-8 text-xs w-[140px] rounded-md border border-input bg-background px-3 py-1"
          >
            <option value="">All Clients</option>
            {derivedClients.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Project</label>
          <select
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
            className="h-8 text-xs w-[150px] rounded-md border border-input bg-background px-3 py-1"
          >
            <option value="">All Projects</option>
            {filteredProjects.map((p) => (
              <option key={p.id} value={String(p.id)}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Status</label>
          <div className="flex gap-1.5 flex-wrap">
            {STATUSES.map((s) => {
              const active = filterStatuses.length === 0 || filterStatuses.includes(s);
              return (
                <button key={s}
                  onClick={() => toggleStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    active
                      ? STATUS_BADGE[s]
                      : "bg-muted text-muted-foreground/50 opacity-50"
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-4 py-2">
          <span>{error}</span>
          <button onClick={fetchTasks} className="underline hover:no-underline ml-auto">Try again</button>
        </div>
      )}

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map((s) => <KanbanColumnSkeleton key={s} />)}
        </div>
      ) : tasks.length === 0 && !loading ? (
        <EmptyState
          icon={<TaskEmptyIcon />}
          title="No tasks found"
          description="Try adjusting your filters or create a new task."
          action={<Button onClick={() => setOpen(true)}>New Task</Button>}
        />
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto lg:hidden pb-2">
            {STATUSES.map((status) => {
              const count = tasks.filter((t) => t.status === status).length;
              return (
                <button key={status}
                  onClick={() => setMobileColumn(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    mobileColumn === status
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {STATUS_LABELS[status]} ({count})
                </button>
              );
            })}
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4">
            {STATUSES.map((status) => {
              const columnTasks = tasks.filter((t) => t.status === status);
              const isVisible = status === mobileColumn;
              return (
                <div key={status}
                  className={`flex-1 min-w-[250px] rounded-lg p-4 ${
                    isVisible ? "block" : "hidden lg:block"
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  <h3 className="font-semibold text-sm mb-3 text-muted-foreground flex items-center gap-2">
                    <span className="badge-dot" style={{ background: DOT_COLORS[status] }} />
                    {STATUS_LABELS[status]} ({columnTasks.length})
                  </h3>
                  <div className="space-y-2 min-h-[80px]">
                    {columnTasks.length === 0 && (
                      <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-4 text-center text-xs text-muted-foreground/50">
                        <span className="text-lg">+</span>
                        <p>Drop tasks here</p>
                      </div>
                    )}
                    {columnTasks.map((task) => (
                      <div key={task.id} ref={(el) => { taskRefs.current[task.id] = el; }}
                        className="bg-white dark:bg-card rounded-lg p-3 border cursor-pointer hover:shadow-sm transition-all duration-200 card-lift slide-up"
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedTask(task)}
                        onKeyDown={(e) => handleKeyboardKeyDown(e, task)}
                        tabIndex={0} role="button"
                        aria-label={`Task: ${task.title}, status: ${task.status}, priority: ${task.priority}`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-medium text-sm mb-1 flex-1 truncate">{task.title}</h4>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <button className="text-muted-foreground hover:text-foreground p-0.5 -mr-1 -mt-0.5"
                                  aria-label="Quick actions">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-36">
                                {STATUSES.map((s) => (
                                  <DropdownMenuItem key={s}
                                    onClick={(e) => { e.stopPropagation(); handleQuickStatus(task.id, s); }}
                                    className={s === task.status ? "text-primary font-medium" : ""}
                                  >
                                    <span className="badge-dot" style={{ background: DOT_COLORS[s] }} />
                                    {STATUS_LABELS[s]}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                                  className="text-destructive">
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1.5 truncate">
                          {task.project?.name} &middot; {task.project?.client?.name}{task.project?.freelancer ? ` (${task.project.freelancer.name})` : ""}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant={PRIORITY_BADGE[task.priority] || "outline"} className="text-[10px] px-1.5 py-0">
                            {task.priority}
                          </Badge>
                          {task.dueDate && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                {total} task{total !== 1 ? "s" : ""} &middot; Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 rounded-lg text-sm border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  Previous
                </button>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg text-sm border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
            <DialogDescription>Create a new task in a project.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Project</label>
              <select
                value={createProjectId}
                onChange={(e) => setCreateProjectId(e.target.value)}
                className="w-full h-9 text-sm rounded-md border border-input bg-background px-3 py-1"
              >
                <option value="">Select project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input type="text" required
                className="w-full border rounded-lg px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 outline-none"
                value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 outline-none"
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Due Date</label>
              <input type="date"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!createProjectId} className="btn-press">Create Task</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet open={!!selectedTask} onOpenChange={(o) => { if (!o) setSelectedTask(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          {selectedTask && (
            <TaskPanel task={selectedTask} onClose={() => setSelectedTask(null)} onUpdate={fetchTasks} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
