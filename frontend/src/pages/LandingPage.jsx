import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ArrowRight, Layout, MessageSquare, FileText, Clock } from "lucide-react";

const features = [
  {
    icon: Layout,
    title: "Kanban Task Board",
    desc: "Drag-and-drop tasks across Planning, Ongoing, Hold, and Completed columns. Never lose track of work again.",
  },
  {
    icon: MessageSquare,
    title: "1-on-1 Chat",
    desc: "Direct messaging with freelancers or clients. Project discussions stay organized and searchable.",
  },
  {
    icon: FileText,
    title: "1-Click Invoicing",
    desc: "Generate professional invoices from logged hours. Print or save as PDF with a single click.",
  },
  {
    icon: Clock,
    title: "Live Time Tracking",
    desc: "Start/stop timers on any task. Track billable hours automatically with per-project rates.",
  },
];

export default function LandingPage() {
  const { user } = useAuth();

  if (user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <span className="font-extrabold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">
          JKAAS
        </span>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Sign in
          </Link>
          <Link
            to="/login"
            className="text-sm bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:opacity-90 transition-all btn-press"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-24 pb-16 max-w-5xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
          The Ultimate{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">
            Client-Freelancer
          </span>{" "}
          Workspace
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Replace messy emails and scattered tools with one unified portal for tasks, chat, time tracking, and invoicing.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-6 py-3 text-sm font-medium hover:opacity-90 transition-all btn-press"
          >
            Get Started <ArrowRight size={16} />
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 border border-border rounded-lg px-6 py-3 text-sm font-medium hover:bg-muted transition-all"
          >
            Learn More
          </a>
        </div>

        {/* Mockup */}
        <div className="mt-16 mx-auto max-w-4xl rounded-xl border border-border/50 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5 p-1">
          <div className="rounded-lg bg-card border border-border/50 p-6 sm:p-10">
            <div className="flex gap-2 mb-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-3 h-3 rounded-full bg-muted" />
              ))}
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
            <div className="h-40 rounded-lg bg-muted/30 animate-pulse" />
          </div>
        </div>
      </section>

      {/* Features Bento */}
      <section id="features" className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
          Everything you need to collaborate
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border/50 bg-card p-6 hover:border-border transition-all hover:-translate-y-0.5"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <f.icon size={20} className="text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-muted-foreground/60 border-t border-border/30">
        &copy; {new Date().getFullYear()} JKAAS &mdash; Developed by Abdullah al Shoyeb. All rights reserved.
      </footer>
    </div>
  );
}
