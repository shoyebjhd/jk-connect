import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, DollarSign, BarChart3, List, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function formatDuration(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getDateRange(label) {
  const now = new Date();
  if (label === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start: start.toISOString(), end: end.toISOString() };
  }
  if (label === "week") {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const start = new Date(now);
    start.setDate(now.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start: start.toISOString(), end: end.toISOString() };
  }
  if (label === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start: start.toISOString(), end: end.toISOString() };
  }
  return { start: "", end: "" };
}

export default function TimeReport() {
  const { isFreelancer } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("week");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(range);
      const params = new URLSearchParams();
      if (start) params.set("weekStart", start);
      if (end) params.set("weekEnd", end);
      const data = await api(`/api/timelogs/all?${params}`);
      setLogs(data);
    } catch {} finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalMinutes = logs.reduce((s, l) => s + (l.duration || 0), 0);
  const billedMinutes = logs.filter((l) => l.isBilled).reduce((s, l) => s + (l.duration || 0), 0);
  const unbilledMinutes = totalMinutes - billedMinutes;

  const dayTotals = {};
  for (const l of logs) {
    if (!l.endTime) continue;
    const day = l.endTime.slice(0, 10);
    dayTotals[day] = (dayTotals[day] || 0) + (l.duration || 0);
  }
  const chartData = Object.entries(dayTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, mins]) => ({ date: new Date(date).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" }), hours: Math.round((mins / 60) * 10) / 10 }));

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Time Report</h1>
        <div className="flex items-center gap-2">
          {["today", "week", "month"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                range === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {!isFreelancer ? (
        <p className="text-sm text-muted-foreground">Time tracking details are available for freelancer accounts.</p>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="border-t-2 border-t-blue-500">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs sm:text-sm text-muted-foreground font-normal">Total Hours</CardTitle>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Clock size={14} className="sm:size-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <span className="text-xl sm:text-2xl font-bold">{formatDuration(totalMinutes)}</span>
              </CardContent>
            </Card>
            <Card className="border-t-2 border-t-emerald-500">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs sm:text-sm text-muted-foreground font-normal">Entries</CardTitle>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <List size={14} className="sm:size-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <span className="text-xl sm:text-2xl font-bold">{logs.length}</span>
              </CardContent>
            </Card>
            <Card className="border-t-2 border-t-amber-500">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs sm:text-sm text-muted-foreground font-normal">Billable</CardTitle>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-600 flex items-center justify-center">
                  <DollarSign size={14} className="sm:size-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <span className="text-xl sm:text-2xl font-bold">{formatDuration(billedMinutes)}</span>
              </CardContent>
            </Card>
            <Card className="border-t-2 border-t-violet-500">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs sm:text-sm text-muted-foreground font-normal">Unbilled</CardTitle>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-violet-600 flex items-center justify-center">
                  <BarChart3 size={14} className="sm:size-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <span className="text-xl sm:text-2xl font-bold">{formatDuration(unbilledMinutes)}</span>
              </CardContent>
            </Card>
          </div>

          {chartData.length > 0 && (
            <Card className="border-t-2 border-t-blue-500">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Hours Per Day</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="hours" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Detailed Log</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-4">
              {logs.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">No time entries found.</div>
              ) : (
                <div className="divide-y divide-border/50">
                  {logs.map((log) => (
                    <div key={log.id} className="px-3 sm:px-0 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="min-w-[100px] shrink-0">
                        <p className="text-xs text-muted-foreground">{formatDate(log.endTime)}</p>
                        <p className="text-[10px] text-muted-foreground/60">
                          {log.startTime && formatTime(log.startTime)} - {log.endTime && formatTime(log.endTime)}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{log.project?.name || "No project"}</p>
                        <p className="text-xs text-muted-foreground truncate">{log.task?.title || "No task"}</p>
                        {log.notes && <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{log.notes}</p>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          log.isBilled
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}>
                          {log.isBilled ? "Billed" : "Unbilled"}
                        </span>
                        <span className="text-sm font-mono font-bold tabular-nums w-14 text-right">
                          {formatDuration(log.duration)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
