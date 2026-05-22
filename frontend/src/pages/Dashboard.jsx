import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCardSkeleton } from "../components/Skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
} from "recharts";
import { Clock, TrendingUp, DollarSign, CheckCircle, FolderKanban, Activity } from "lucide-react";

const STATUS_LABELS = {
  PLANNING: "Planning", ONGOING: "Ongoing", HOLD: "Hold",
  COMPLETED: "Completed", DECLINED: "Declined",
};

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { weekStart: monday.toISOString(), weekEnd: sunday.toISOString() };
}

function formatDuration(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function last6Months() {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(d.toLocaleString("en-US", { month: "short", year: "numeric" }));
  }
  return months;
}

function StatCard({ icon: Icon, label, value, color, accent, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className={`card-lift border border-border/50 hover:border-border transition-all border-t-2 ${accent || ""}`}>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm text-muted-foreground font-normal">{label}</CardTitle>
          <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
            <Icon size={16} className="text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <span className="text-2xl font-bold">{value}</span>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ChartCard({ title, delay, accent, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="col-span-1 md:col-span-2 lg:col-span-1"
    >
      <Card className={`card-lift border border-border/50 hover:border-border transition-all h-full border-t-2 ${accent || ""}`}>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

const CHARTS = {
  freelancer: { bar: "#2563eb", area: "#059669", areaFill: "#059669" },
  client: { bar: "#0d9488", line: "#6366f1" },
};

export default function Dashboard() {
  const { user, isFreelancer } = useAuth();
  const chart = isFreelancer ? CHARTS.freelancer : CHARTS.client;
  const [loading, setLoading] = useState(true);

  const [running, setRunning] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [unpaidTotal, setUnpaidTotal] = useState(0);
  const [activeTasks, setActiveTasks] = useState(0);
  const [recent, setRecent] = useState([]);
  const [hoursData, setHoursData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);

  const [clientActiveProjects, setClientActiveProjects] = useState(0);
  const [clientCompletedTasks, setClientCompletedTasks] = useState(0);
  const [clientPendingAmount, setClientPendingAmount] = useState(0);
  const [clientPaidTotal, setClientPaidTotal] = useState(0);
  const [clientHoursData, setClientHoursData] = useState([]);
  const [clientSpendingData, setClientSpendingData] = useState([]);
  const [clientRecent, setClientRecent] = useState([]);

  const fetchStats = useCallback(async () => {
    setLoading(true);

    if (isFreelancer) {
      const results = await Promise.allSettled([
        api("/api/timelogs/running"),
        (async () => {
          const { weekStart, weekEnd } = getWeekBounds();
          return api(`/api/timelogs/all?weekStart=${encodeURIComponent(weekStart)}&weekEnd=${encodeURIComponent(weekEnd)}`);
        })(),
        api("/api/invoices"),
        api("/api/tasks"),
      ]);

      const [runRes, logsRes, invRes, tasksRes] = results;

      if (runRes.status === "fulfilled" && runRes.value) {
        setRunning(runRes.value);
        localStorage.setItem("runningTimeLogId", String(runRes.value.id));
      } else {
        setRunning(null);
        localStorage.removeItem("runningTimeLogId");
      }

      if (logsRes.status === "fulfilled" && logsRes.value) {
        const weeklyLogs = logsRes.value;
        setWeeklyMinutes(weeklyLogs.reduce((sum, l) => sum + (l.duration || 0), 0));
        const days = last7Days();
        const dayTotals = days.map((date) => {
          const dayLogs = weeklyLogs.filter((l) => l.endTime && l.endTime.slice(0, 10) === date);
          const mins = dayLogs.reduce((s, l) => s + (l.duration || 0), 0);
          return { date: new Date(date).toLocaleDateString("en", { weekday: "short" }), hours: Math.round((mins / 60) * 10) / 10 };
        });
        setHoursData(dayTotals);
      }

      if (invRes.status === "fulfilled" && invRes.value) {
        const unpaid = invRes.value.filter((i) => i.status === "UNPAID");
        setUnpaidCount(unpaid.length);
        setUnpaidTotal(unpaid.reduce((s, i) => s + i.amount, 0));
        const months = last6Months();
        const monthTotals = months.map((month) => {
          const monthInvs = invRes.value.filter((i) => {
            const d = new Date(i.createdAt);
            return d.toLocaleString("en-US", { month: "short", year: "numeric" }) === month && i.status === "PAID";
          });
          return { month, revenue: monthInvs.reduce((s, i) => s + i.amount, 0) };
        });
        setRevenueData(monthTotals);
      }

      if (tasksRes.status === "fulfilled" && tasksRes.value) {
        const allTasks = tasksRes.value;
        setActiveTasks(allTasks.filter((t) => t.status === "ONGOING" || t.status === "PLANNING").length);
        setRecent(allTasks.slice(0, 5).map((t) => ({
          id: t.id,
          type: "task",
          text: `${t.title} — ${STATUS_LABELS[t.status] || t.status}`,
          time: t.updatedAt,
          project: t.project?.name,
        })));
      }
    } else {
      const results = await Promise.allSettled([
        api("/api/projects"),
        api("/api/tasks"),
        api("/api/invoices"),
        (async () => {
          const { weekStart, weekEnd } = getWeekBounds();
          return api(`/api/timelogs/all?weekStart=${encodeURIComponent(weekStart)}&weekEnd=${encodeURIComponent(weekEnd)}`);
        })(),
        api("/api/chat/general"),
      ]);

      const [projRes, tasksRes, invRes, logsRes, chatRes] = results;

      if (projRes.status === "fulfilled" && projRes.value) {
        const allProjects = projRes.value;
        setClientActiveProjects(allProjects.filter((p) => p.isActive).length);
      }

      if (tasksRes.status === "fulfilled" && tasksRes.value) {
        const allTasks = tasksRes.value;
        setClientCompletedTasks(allTasks.filter((t) => t.status === "COMPLETED").length);
        setClientRecent(allTasks.slice(0, 5).map((t) => ({
          id: t.id,
          type: "task",
          text: `${t.title} — ${STATUS_LABELS[t.status] || t.status}`,
          time: t.updatedAt,
          project: t.project?.name,
        })));
      }

      if (invRes.status === "fulfilled" && invRes.value) {
        const invoices = invRes.value;
        const pending = invoices.filter((i) => i.status === "UNPAID");
        setClientPendingAmount(pending.reduce((s, i) => s + i.amount, 0));
        const paid = invoices.filter((i) => i.status === "PAID");
        setClientPaidTotal(paid.reduce((s, i) => s + i.amount, 0));

        const months = last6Months();
        const monthTotals = months.map((month) => {
          const monthInvs = invoices.filter((i) => {
            const d = new Date(i.createdAt);
            return d.toLocaleString("en-US", { month: "short", year: "numeric" }) === month;
          });
          return { month, amount: monthInvs.reduce((s, i) => s + i.amount, 0) };
        });
        setClientSpendingData(monthTotals);
      }

      if (logsRes.status === "fulfilled" && logsRes.value) {
        const logs = logsRes.value;
        const days = last7Days();
        const dayTotals = days.map((date) => {
          const dayLogs = logs.filter((l) => l.endTime && l.endTime.slice(0, 10) === date);
          const mins = dayLogs.reduce((s, l) => s + (l.duration || 0), 0);
          return { date: new Date(date).toLocaleDateString("en", { weekday: "short" }), hours: Math.round((mins / 60) * 10) / 10 };
        });
        setClientHoursData(dayTotals);
      }

      if (chatRes.status === "fulfilled" && chatRes.value) {
        const recentMsgs = chatRes.value.slice(-3).map((m) => ({
          id: `msg-${m.id}`,
          type: "message",
          text: `${m.author?.name}: ${m.content}`,
          time: m.createdAt,
          project: "General",
        }));
        setClientRecent((prev) => [...recentMsgs, ...prev].slice(0, 8));
      }
    }

    setLoading(false);
  }, [isFreelancer]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (!running) { setElapsed(0); return; }
    const update = () => setElapsed(Math.floor((Date.now() - new Date(running.startTime).getTime()) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [running]);

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {isFreelancer ? (
        <>
          {/* Stat Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={running ? Clock : Clock}
              label="Timer"
              value={running ? (
                <span className="font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">{formatTime(elapsed)}</span>
              ) : "Not running"}
              color="bg-blue-600"
              accent="border-t-blue-500"
              delay={0}
            />
            <StatCard icon={TrendingUp} label="Hours This Week" value={formatDuration(weeklyMinutes)} color="bg-emerald-600" accent="border-t-emerald-500" delay={0.05} />
            <StatCard icon={DollarSign} label="Unpaid" value={`${unpaidCount} ($${unpaidTotal.toFixed(2)})`} color="bg-amber-600" accent="border-t-amber-500" delay={0.1} />
            <StatCard icon={CheckCircle} label="Active Tasks" value={activeTasks} color="bg-violet-600" accent="border-t-violet-500" delay={0.15} />
          </div>

          {/* Charts Bento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="Hours Logged (Last 7 Days)" delay={0.2} accent="border-t-blue-500">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hoursData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }} />
                  <Bar dataKey="hours" fill={chart.bar} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Revenue Earned (Last 6 Months)" delay={0.25} accent="border-t-emerald-500">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }} />
                  <Area type="monotone" dataKey="revenue" stroke={chart.area} fill={chart.areaFill} fillOpacity={0.2} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      ) : (
        <>
          {/* Client Stat Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard icon={FolderKanban} label="Active Projects" value={clientActiveProjects} color="bg-teal-600" accent="border-t-teal-500" delay={0} />
            <StatCard icon={CheckCircle} label="Tasks Completed" value={clientCompletedTasks} color="bg-cyan-600" accent="border-t-cyan-500" delay={0.05} />
            <StatCard icon={DollarSign} label="Pending Invoices" value={`$${clientPendingAmount.toFixed(2)}`} color="bg-rose-600" accent="border-t-rose-500" delay={0.1} />
            <StatCard icon={TrendingUp} label="Total Paid" value={`$${clientPaidTotal.toFixed(2)}`} color="bg-indigo-600" accent="border-t-indigo-500" delay={0.15} />
          </div>

          {/* Client Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="Hours Received (Last 7 Days)" delay={0.2} accent="border-t-teal-500">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={clientHoursData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }} />
                  <Bar dataKey="hours" fill={chart.bar} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Spending Over Time (Last 6 Months)" delay={0.25} accent="border-t-indigo-500">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={clientSpendingData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }} />
                  <Line type="monotone" dataKey="amount" stroke={chart.line} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card className={`card-lift border border-border/50 hover:border-border transition-all border-t-2 ${isFreelancer ? "border-t-violet-500" : "border-t-cyan-500"}`}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity size={16} className="text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {recent.length === 0 && clientRecent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              (isFreelancer ? recent : clientRecent).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="text-xs shrink-0">{item.project || "General"}</Badge>
                    <span className="truncate">{item.text}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {new Date(item.time).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
