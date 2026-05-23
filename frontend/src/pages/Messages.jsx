import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { File, Download, ArrowLeft, MessageSquare } from "lucide-react";
import ChatInput from "../components/ChatInput";

export default function Messages() {
  const { user } = useAuth();
  const [connections, setConnections] = useState([]);
  const [selectedConn, setSelectedConn] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const [showList, setShowList] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api("/api/network/connections");
        setConnections(data);
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  const fetchMessages = async () => {
    if (!selectedConn) return;
    try {
      const data = await api(`/api/chat/dm/${selectedConn.id}`);
      setMessages(data);
    } catch {}
  };

  useEffect(() => {
    fetchMessages();
    const iv = setInterval(fetchMessages, 10000);
    return () => clearInterval(iv);
  }, [selectedConn]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async ({ content, attachment }) => {
    if (!selectedConn) return;
    const body = { content };
    if (attachment) {
      body.attachmentUrl = attachment.url;
      body.attachmentName = attachment.name;
      body.attachmentType = attachment.type;
    }
    const msg = await api(`/api/chat/dm/${selectedConn.id}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    setMessages((prev) => [...prev, msg]);
  };

  const otherUser = selectedConn
    ? { name: selectedConn.name, role: selectedConn.role }
    : null;

  const handleSelectConn = (conn) => {
    setSelectedConn(conn);
    setShowList(false);
  };

  const handleBack = () => {
    setShowList(true);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-3 sm:p-4 border-b border-border/50 space-y-2">
        <h2 className="font-semibold text-sm">Direct Messages</h2>
        <Link
          to="/chat/general"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors btn-press px-2 py-1.5 rounded-lg"
        >
          <MessageSquare size={14} />
          General Chat
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="text-sm text-muted-foreground p-2 animate-pulse">Loading...</div>
        ) : connections.length === 0 ? (
          <div className="text-sm text-muted-foreground p-2">No connections yet.</div>
        ) : (
          connections.map((conn) => (
            <button
              key={conn.id}
              onClick={() => handleSelectConn(conn)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors btn-press ${
                selectedConn?.id === conn.id
                  ? "bg-primary/10 text-foreground"
                  : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                  {conn.name.charAt(0).toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{conn.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {conn.role === "FREELANCER" ? "Freelancer" : "Client"}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );

  const chatContent = selectedConn && (
    <div className="flex flex-col h-full">
      <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b border-border/50 flex items-center gap-3">
        <button
          className="sm:hidden text-muted-foreground hover:text-foreground p-1 -ml-1"
          onClick={handleBack}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
          {otherUser?.name?.charAt(0)?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{otherUser?.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {otherUser?.role === "FREELANCER" ? "Freelancer" : "Client"}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id}
              className={`flex ${m.authorId === user?.userId ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[85%] sm:max-w-[70%] rounded-xl p-3 ${
                m.authorId === user?.userId
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted rounded-bl-sm"
              }`}>
                {m.attachmentUrl && (
                  <div className="mb-2">
                    {m.attachmentType?.startsWith("image/") ? (
                      <div className="relative group inline-block">
                        <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer">
                          <img src={m.attachmentUrl} alt={m.attachmentName || "image"} className="max-w-full max-h-36 sm:max-h-48 rounded-lg object-cover" />
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
                <p className="text-xs opacity-60 mt-1">
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 sm:p-4 border-t border-border/50">
        <ChatInput onSubmit={handleSend} />
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100dvh-8rem)] sm:h-[calc(100vh-8rem)] p-0 sm:p-4">
      <div className="h-full flex">
        {/* Sidebar - hidden on mobile when chat is open */}
        <div className={`w-full sm:w-72 shrink-0 flex flex-col bg-sidebar sm:rounded-l-xl border-r border-border/50 overflow-hidden sm:block ${!showList && selectedConn ? "hidden" : ""}`}>
          {sidebarContent}
        </div>

        {/* Chat - hidden on mobile when list is shown */}
        <div className={`flex-1 flex flex-col bg-card sm:rounded-r-xl border overflow-hidden sm:flex ${showList || !selectedConn ? "hidden sm:flex" : ""}`}>
          {!selectedConn ? (
            <div className="flex-1 hidden sm:flex items-center justify-center text-sm text-muted-foreground">
              Select a connection to start chatting
            </div>
          ) : (
            chatContent
          )}
        </div>
      </div>
    </div>
  );
}
