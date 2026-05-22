import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import EmptyState, { FolderEmptyIcon } from "../components/EmptyState";
import { CardSkeleton } from "../components/Skeleton";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const emptyForm = {
  name: "", description: "", billingType: "HOURLY",
  hourlyRate: "", fixedPrice: "", clientId: "",
};

export default function Projects() {
  const { isFreelancer, user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [connections, setConnections] = useState([]);

  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState([]);
  const [clientSearching, setClientSearching] = useState(false);
  const [showClientResults, setShowClientResults] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedFreelancerId, setSelectedFreelancerId] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteResult, setInviteResult] = useState(null);
  const [inviteSaving, setInviteSaving] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444"];

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await api("/api/projects");
      setProjects(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnections = async () => {
    try {
      const data = await api("/api/network/connections");
      setConnections(data);
    } catch {}
  };

  useEffect(() => { fetchProjects(); if (!isFreelancer) fetchConnections(); }, []);

  const searchClients = useCallback(async (q) => {
    if (q.length < 2) { setClientResults([]); return; }
    setClientSearching(true);
    try {
      const data = await api(`/api/clients/search?q=${encodeURIComponent(q)}`);
      setClientResults(data);
      setShowClientResults(true);
    } catch {} finally {
      setClientSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchClients(clientQuery), 300);
    return () => clearTimeout(timer);
  }, [clientQuery, searchClients]);

  const selectClient = (client) => {
    setSelectedClient(client);
    setForm((f) => ({ ...f, clientId: String(client.id) }));
    setClientQuery(client.name);
    setShowClientResults(false);
  };

  const openNew = () => {
    setEditProject(null);
    setForm({ ...emptyForm });
    setSelectedClient(null);
    setClientQuery("");
    setSelectedFreelancerId("");
    setOpen(true);
  };

  const openEdit = (p) => {
    setEditProject(p);
    setForm({
      name: p.name,
      description: p.description || "",
      billingType: p.billingType,
      hourlyRate: p.hourlyRate ? String(p.hourlyRate) : "",
      fixedPrice: p.fixedPrice ? String(p.fixedPrice) : "",
      clientId: String(p.clientId),
    });
    setSelectedClient(p.client);
    setClientQuery(p.client?.name || "");
    setSelectedFreelancerId(p.freelancerId ? String(p.freelancerId) : "");
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body = {
      name: form.name,
      description: form.description || undefined,
      billingType: form.billingType,
      hourlyRate: form.billingType === "HOURLY" ? Number(form.hourlyRate) : undefined,
      fixedPrice: form.billingType === "FIXED" ? Number(form.fixedPrice) : undefined,
    };
    if (isFreelancer) {
      body.clientId = Number(form.clientId);
    } else {
      body.freelancerId = Number(selectedFreelancerId);
    }
    try {
      if (editProject) {
        await api(`/api/projects/${editProject.id}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await api("/api/projects", { method: "POST", body: JSON.stringify(body) });
      }
      setOpen(false);
      fetchProjects();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this project?")) return;
    try { await api(`/api/projects/${id}`, { method: "DELETE" }); fetchProjects(); }
    catch (err) { setError(err.message); }
  };

  const fetchReport = async (projectId) => {
    setReportLoading(true);
    setReportData(null);
    try {
      const data = await api(`/api/projects/${projectId}/report`);
      setReportData(data);
      setReportOpen(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setReportLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteSaving(true);
    setInviteResult(null);
    try {
      const data = await api("/api/network/invite", {
        method: "POST",
        body: JSON.stringify({ receiverEmail: inviteEmail, targetRole: isFreelancer ? "CLIENT" : "FREELANCER" }),
      });
      setInviteResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setInviteSaving(false);
    }
  };

  const dialogTitle = editProject ? "Edit Project" : "New Project";
  const dialogDesc = editProject ? "Update the project details." : "Create a new project.";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <Button onClick={openNew} className="btn-press">New Project</Button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderEmptyIcon />}
          title="No projects yet"
          description="Create your first project to get started."
          action={<Button onClick={openNew}>New Project</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id} className="card-lift border-transparent hover:border-border slide-up">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle>{p.name}</CardTitle>
                  <Badge variant={p.billingType === "HOURLY" ? "secondary" : "default"}>
                    {p.billingType}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-muted-foreground text-sm">Client: {p.client?.name}</p>
                <p className="text-muted-foreground text-sm">Freelancer: {p.freelancer?.name}</p>
                <p className="text-muted-foreground text-sm">
                  {p.isActive ? (
                    <span className="text-emerald-600 font-medium">Active</span>
                  ) : (
                    <span className="text-destructive font-medium">Inactive</span>
                  )}
                </p>
              </CardContent>
              <CardFooter className="gap-2 flex-wrap">
                <a href={`/tasks?projectId=${p.id}`}
                  className="inline-flex items-center justify-center rounded-lg border border-border bg-background h-7 px-2.5 text-[0.8rem] font-medium hover:bg-muted transition-colors btn-press">
                  Tasks
                </a>
                <Link to={`/chat/project/${p.id}`}
                  className="inline-flex items-center justify-center rounded-lg border border-border bg-background h-7 px-2.5 text-[0.8rem] font-medium hover:bg-muted transition-colors btn-press">
                  Discuss
                </Link>
                <button onClick={() => fetchReport(p.id)}
                  className="inline-flex items-center justify-center rounded-lg border border-border bg-background h-7 px-2.5 text-[0.8rem] font-medium hover:bg-muted transition-colors btn-press">
                  Report
                </button>
                {(!editProject || editProject.id !== p.id) && (
                  <>
                    <button className="text-sm text-primary hover:underline" onClick={() => openEdit(p)}>Edit</button>
                    <button className="text-sm text-destructive hover:underline" onClick={() => handleDelete(p.id)}>Delete</button>
                  </>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDesc}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input type="text" required
                className="w-full border rounded-lg px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 outline-none"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 outline-none"
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            {isFreelancer ? (
              <div>
                <label className="block text-sm font-medium mb-1">Client</label>
                <div className="relative">
                  <input type="text" required placeholder="Search clients..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 outline-none"
                    value={clientQuery}
                    onChange={(e) => { setClientQuery(e.target.value); setSelectedClient(null); setForm((f) => ({ ...f, clientId: "" })); }}
                    onFocus={() => clientResults.length > 0 && setShowClientResults(true)}
                    onBlur={() => setTimeout(() => setShowClientResults(false), 200)} />
                  {showClientResults && clientResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {clientResults.map((c) => (
                        <button key={c.id} type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                          onMouseDown={() => selectClient(c)}>
                          {c.name} <span className="text-muted-foreground">({c.email})</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {clientSearching && <p className="text-xs text-muted-foreground mt-1">Searching...</p>}
                </div>
                <div className="mt-1">
                  {selectedClient && (
                    <span className="text-xs text-emerald-600">Selected: {selectedClient.name}</span>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">Assigned Freelancer</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                  value={selectedFreelancerId}
                  onChange={(e) => setSelectedFreelancerId(e.target.value)}
                  required
                >
                  <option value="">Select freelancer...</option>
                  {connections.map((c) => (
                    <option key={c.userId} value={String(c.userId)}>{c.name} ({c.email})</option>
                  ))}
                </select>
                {connections.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    No connected freelancers.{" "}
                    <button type="button" className="text-primary hover:underline" onClick={() => setInviteOpen(true)}>
                      Invite one
                    </button>
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Billing Type</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.billingType}
                onChange={(e) => setForm({ ...form, billingType: e.target.value, hourlyRate: "", fixedPrice: "" })}>
                <option value="HOURLY">Hourly</option>
                <option value="FIXED">Fixed</option>
              </select>
            </div>
            {form.billingType === "HOURLY" ? (
              <div>
                <label className="block text-sm font-medium mb-1">Hourly Rate ($)</label>
                <input type="number" step="0.01" required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 outline-none"
                  value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">Fixed Price ($)</label>
                <input type="number" step="0.01" required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 outline-none"
                  value={form.fixedPrice} onChange={(e) => setForm({ ...form, fixedPrice: e.target.value })} />
              </div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={saving} className="btn-press">
                {saving ? "Saving..." : editProject ? "Update Project" : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={(o) => { if (!o) { setInviteOpen(false); setInviteResult(null); setInviteEmail(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a {isFreelancer ? "Client" : "Freelancer"}</DialogTitle>
            <DialogDescription>Send an invitation by email to connect.</DialogDescription>
          </DialogHeader>
          {inviteResult ? (
            <div className="space-y-3">
              <p className="text-sm text-emerald-600 font-medium">Invitation created!</p>
              <p className="text-xs text-muted-foreground">Share this link with {inviteEmail}:</p>
              <div className="bg-muted rounded-lg p-3 text-xs break-all select-all font-mono">
                {inviteResult.acceptLink}
              </div>
              <Button size="sm" onClick={() => { navigator.clipboard?.writeText(inviteResult.acceptLink); }}>Copy Link</Button>
            </div>
          ) : (
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" required placeholder="email@example.com"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 outline-none"
                  value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={inviteSaving}>
                  {inviteSaving ? "Sending..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={(o) => { if (!o) { setReportOpen(false); setReportData(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Project Report</DialogTitle>
            <DialogDescription>
              {reportData ? `${reportData.projectName} — ${reportData.clientName}${reportData.freelancerName ? ` / ${reportData.freelancerName}` : ""}` : "Loading..."}
            </DialogDescription>
          </DialogHeader>
          {reportLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse text-muted-foreground">Loading report...</div>
            </div>
          ) : reportData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground">Total Time</p>
                  <p className="text-xl font-bold">
                    {Math.floor(reportData.totalMinutes / 60)}h {Math.round(reportData.totalMinutes % 60)}m
                  </p>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-xl font-bold">${reportData.totalRevenue.toFixed(2)}</p>
                </div>
              </div>
              {reportData.taskCount > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Task Status Distribution</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={Object.entries(reportData.statusBreakdown).map(([k, v]) => ({ name: k, value: v }))}
                        cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                        {Object.entries(reportData.statusBreakdown).map(([k], i) => (
                          <Cell key={k} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {Object.entries(reportData.statusBreakdown).map(([status, count], i) => (
                      <Badge key={status} style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length], color: "white" }}>
                        {status}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {reportData.taskCount === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No tasks in this project yet.</p>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => { setReportOpen(false); setReportData(null); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
