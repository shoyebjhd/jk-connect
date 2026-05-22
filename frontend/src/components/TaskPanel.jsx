import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { File, Download } from "lucide-react";
import { CommentEmptyIcon } from "./EmptyState";
import ChatInput from "./ChatInput";

const priorityBadge = {
  HIGH: "destructive",
  MEDIUM: "secondary",
  LOW: "outline",
};

export default function TaskPanel({ task, onClose }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [showTimeDialog, setShowTimeDialog] = useState(false);
  const [timeForm, setTimeForm] = useState({ date: "", hours: "", minutes: "", notes: "" });
  const [timeSaving, setTimeSaving] = useState(false);
  const [timeError, setTimeError] = useState("");

  const fetchComments = async () => {
    try {
      const data = await api(`/api/tasks/${task.id}/comments`);
      setComments(data);
    } catch {}
  };

  useEffect(() => {
    fetchComments();
    const interval = setInterval(fetchComments, 10000);
    return () => clearInterval(interval);
  }, [task.id]);

  const handleSend = async ({ content, attachment }) => {
    const body = { content };
    if (attachment) {
      body.attachmentUrl = attachment.url;
      body.attachmentName = attachment.name;
      body.attachmentType = attachment.type;
    }
    await api(`/api/tasks/${task.id}/comments`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    fetchComments();
  };

  const handleManualTime = async (e) => {
    e.preventDefault();
    setTimeSaving(true);
    setTimeError("");
    try {
      const durationMinutes = Number(timeForm.hours) * 60 + Number(timeForm.minutes);
      if (durationMinutes < 1) { setTimeError("Duration must be at least 1 minute"); setTimeSaving(false); return; }
      await api("/api/timelogs/manual", {
        method: "POST",
        body: JSON.stringify({
          taskId: task.id,
          date: new Date(timeForm.date).toISOString(),
          durationMinutes,
          notes: timeForm.notes || undefined,
        }),
      });
      setShowTimeDialog(false);
      setTimeForm({ date: "", hours: "", minutes: "", notes: "" });
    } catch (err) {
      setTimeError(err.message);
    } finally {
      setTimeSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">{task.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={priorityBadge[task.priority] || "outline"}>{task.priority}</Badge>
            <Button size="sm" variant="outline" className="text-xs h-6" onClick={() => setShowTimeDialog(true)}>
              + Add Time
            </Button>
          </div>
          {task.dueDate && (
            <p className="text-sm text-muted-foreground mt-1">
              Due: {new Date(task.dueDate).toLocaleDateString()}
            </p>
          )}
          {task.description && (
            <p className="text-sm text-muted-foreground mt-2">{task.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Project: {task.project?.name} &middot; Client: {task.project?.client?.name}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Comments</h3>
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CommentEmptyIcon />
            <p className="text-sm text-muted-foreground mt-2">No messages yet. Start the conversation.</p>
          </div>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className={`p-3 rounded-lg text-sm ${
                c.authorId === user?.userId
                  ? "bg-blue-100 dark:bg-blue-900/30 ml-6"
                  : "bg-muted mr-6"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-xs">{c.author?.name}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(c.createdAt).toLocaleString()}
                </span>
              </div>
              {c.attachmentUrl && (
                <div className="mb-2">
                  {c.attachmentType?.startsWith("image/") ? (
                    <div className="relative group inline-block">
                      <a href={c.attachmentUrl} target="_blank" rel="noopener noreferrer">
                        <img src={c.attachmentUrl} alt={c.attachmentName || "image"} className="max-w-full max-h-48 rounded-lg object-cover" />
                      </a>
                      <a
                        href={c.attachmentUrl}
                        download={c.attachmentName || "image"}
                        className="absolute bottom-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-md p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Download image"
                      >
                        <Download size={14} />
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <a href={c.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs bg-black/10 dark:bg-white/10 rounded-lg px-3 py-1.5 hover:opacity-80 transition-opacity flex-1 min-w-0">
                        <File size={14} />
                        <span className="truncate">{c.attachmentName || "File"}</span>
                      </a>
                      <a
                        href={c.attachmentUrl}
                        download={c.attachmentName || "file"}
                        className="flex items-center gap-1 text-xs bg-black/10 dark:bg-white/10 rounded-lg px-2.5 py-1.5 hover:opacity-80 transition-opacity shrink-0"
                        aria-label="Download file"
                      >
                        <Download size={14} />
                      </a>
                    </div>
                  )}
                </div>
              )}
              <p className="whitespace-pre-wrap break-words">{c.content}</p>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t">
        <ChatInput onSubmit={handleSend} placeholder="Type a comment..." />
      </div>

      <Dialog open={showTimeDialog} onOpenChange={setShowTimeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Manual Time</DialogTitle>
            <DialogDescription>
              Log time for: {task.title}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleManualTime} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 outline-none"
                value={timeForm.date}
                onChange={(e) => setTimeForm({ ...timeForm, date: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Hours</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 outline-none"
                  value={timeForm.hours}
                  onChange={(e) => setTimeForm({ ...timeForm, hours: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Minutes</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  step="1"
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 outline-none"
                  value={timeForm.minutes}
                  onChange={(e) => setTimeForm({ ...timeForm, minutes: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes (optional)</label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 outline-none"
                value={timeForm.notes}
                onChange={(e) => setTimeForm({ ...timeForm, notes: e.target.value })}
              />
            </div>
            {timeError && <p className="text-destructive text-sm">{timeError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowTimeDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={timeSaving} className="btn-press">
                {timeSaving ? "Saving..." : "Save Time"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
