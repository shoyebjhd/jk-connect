import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { File, Image, Download } from "lucide-react";
import ChatInput from "../components/ChatInput";

export default function Chat() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const bottomRef = useRef(null);

  const isProjectChat = !!projectId;

  const fetchMessages = async () => {
    try {
      const url = isProjectChat ? `/api/chat/project/${projectId}` : "/api/chat/general";
      const data = await api(url);
      setMessages(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const iv = setInterval(fetchMessages, 5000);
    return () => clearInterval(iv);
  }, [projectId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!isProjectChat) return;
    (async () => {
      try {
        const data = await api("/api/projects");
        const p = data.find((x) => x.id === Number(projectId));
        if (p) setProject(p);
      } catch {}
    })();
  }, [projectId]);

  const handleSend = async ({ content, attachment }) => {
    const url = isProjectChat ? `/api/chat/project/${projectId}` : "/api/chat/general";
    const body = { content };
    if (attachment) {
      body.attachmentUrl = attachment.url;
      body.attachmentName = attachment.name;
      body.attachmentType = attachment.type;
    }
    const msg = await api(url, { method: "POST", body: JSON.stringify(body) });
    setMessages((prev) => [...prev, msg]);
  };

  const title = isProjectChat
    ? `Project Discussion${project ? ` — ${project.name}` : ""}`
    : "Messages";

  return (
    <div className="p-6 h-[calc(100vh-8rem)] flex flex-col">
      <h1 className="text-2xl font-bold tracking-tight mb-4">{title}</h1>
      <p className="text-sm text-muted-foreground -mt-3 mb-4">
        {isProjectChat ? `Chat room for project #${projectId}` : "General discussion between all team members."}
      </p>

      <div className="flex-1 overflow-y-auto space-y-3 rounded-xl border bg-card p-4 mb-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-muted-foreground">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id}
              className={`flex ${m.authorId === user?.userId ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[70%] rounded-xl p-3 ${
                m.authorId === user?.userId
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted rounded-bl-sm"
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium opacity-80">{m.author?.name}</span>
                  <span className="text-xs opacity-60">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {m.attachmentUrl && (
                  <div className="mb-2">
                    {m.attachmentType?.startsWith("image/") ? (
                      <div className="relative group inline-block">
                        <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer">
                          <img src={m.attachmentUrl} alt={m.attachmentName || "image"} className="max-w-full max-h-48 rounded-lg object-cover" />
                        </a>
                        <a
                          href={m.attachmentUrl}
                          download={m.attachmentName || "image"}
                          className="absolute bottom-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-md p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Download image"
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs bg-black/10 dark:bg-white/10 rounded-lg px-3 py-1.5 hover:opacity-80 transition-opacity flex-1 min-w-0">
                          <File size={14} />
                          <span className="truncate">{m.attachmentName || "File"}</span>
                        </a>
                        <a
                          href={m.attachmentUrl}
                          download={m.attachmentName || "file"}
                          className="flex items-center gap-1 text-xs bg-black/10 dark:bg-white/10 rounded-lg px-2.5 py-1.5 hover:opacity-80 transition-opacity shrink-0"
                          aria-label="Download file"
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSubmit={handleSend} />
    </div>
  );
}
