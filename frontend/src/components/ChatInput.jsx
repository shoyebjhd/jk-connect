import { useRef, useState } from "react";
import { api } from "../lib/api";
import { Paperclip, File, X, Image } from "lucide-react";

export default function ChatInput({ onSubmit, placeholder = "Type a message..." }) {
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const fileRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && !attachment) return;
    try {
      await onSubmit({ content: content.trim(), attachment });
      setContent("");
      setAttachment(null);
    } catch {}
  };

  const handleFilePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAttachment({ url: data.url, name: data.name, type: data.type });
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const isImage = attachment?.type?.startsWith("image/");

  return (
    <div className="flex flex-col gap-2">
      {attachment && (
        <div className="flex items-center gap-2 text-xs bg-muted rounded-lg px-3 py-1.5">
          {isImage ? <Image size={14} /> : <File size={14} />}
          <span className="truncate flex-1">{attachment.name}</span>
          <button onClick={() => setAttachment(null)} className="text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        </div>
      )}
      <div className="flex gap-2 items-end">
        <textarea
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 outline-none bg-background resize-none min-h-[38px] max-h-[120px] leading-5"
          placeholder={placeholder}
          rows={1}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={(e) => {
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
          }}
        />
        <input ref={fileRef} type="file" className="hidden" onChange={handleFilePick} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted shrink-0"
          title="Attach file"
        >
          <Paperclip size={16} />
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={(!content.trim() && !attachment) || uploading}
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm hover:opacity-90 disabled:opacity-50 transition-all btn-press shrink-0"
        >
          {uploading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
