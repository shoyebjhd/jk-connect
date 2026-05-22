import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Network() {
  const { user, isFreelancer } = useAuth();
  const [sentInvites, setSentInvites] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [connections, setConnections] = useState([]);
  const [email, setEmail] = useState("");
  const [targetRole, setTargetRole] = useState("FREELANCER");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [sentRes, pendRes, connRes] = await Promise.all([
        api("/api/network/sent-invites").catch(() => []),
        api("/api/network/pending-invites").catch(() => []),
        api("/api/network/connections").catch(() => []),
      ]);
      setSentInvites(sentRes);
      setPendingInvites(pendRes);
      setConnections(connRes);
    } catch {
      setError("Failed to load network data");
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const data = await api("/api/network/invite", {
        method: "POST",
        body: JSON.stringify({ email, targetRole }),
      });
      setSuccess(data.message);
      setEmail("");
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const revokeInvite = async (id) => {
    await api(`/api/network/sent-invites/${id}`, { method: "DELETE" });
    fetchData();
  };

  const respondInvite = async (id, action) => {
    try {
      const data = await api(`/api/network/respond-invite/${id}`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      setSuccess(data.message);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const disconnect = async (id) => {
    await api(`/api/network/connections/${id}`, { method: "DELETE" });
    fetchData();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 page-fade-in">
      <h1 className="text-2xl font-bold">
        {isFreelancer ? "My Clients" : "My Freelancers"}
      </h1>

      {/* Incoming Invites */}
      {pendingInvites.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Connection Requests</h2>
          {pendingInvites.map((inv) => (
            <div key={inv.id} className="glass rounded-xl p-5 flex items-center justify-between slide-up">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                  {inv.sender?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{inv.sender?.name} wants to connect</p>
                  <p className="text-xs text-muted-foreground">As a {inv.targetRole === "FREELANCER" ? "Freelancer" : "Client"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => respondInvite(inv.id, "ACCEPTED")}
                  className="text-sm bg-primary text-primary-foreground rounded-lg px-4 py-1.5 hover:opacity-90 transition-all btn-press"
                >
                  Accept
                </button>
                <button
                  onClick={() => respondInvite(inv.id, "DECLINED")}
                  className="text-sm bg-muted text-muted-foreground rounded-lg px-4 py-1.5 hover:bg-muted/80 transition-all btn-press"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite Card */}
      <div className="glass rounded-xl p-6 space-y-4 slide-up">
        <h2 className="font-semibold text-lg">Invite a New Collaborator</h2>
        <p className="text-sm text-muted-foreground">Enter the email of an existing user to send them a connection request.</p>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            required
            placeholder="email@example.com"
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 outline-none bg-background"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select
            className="border rounded-lg px-3 py-2 text-sm bg-background"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
          >
            <option value="FREELANCER">Freelancer</option>
            <option value="CLIENT">Client</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm hover:opacity-90 disabled:opacity-50 transition-all btn-press shrink-0"
          >
            {loading ? "Sending..." : "Send Invite"}
          </button>
        </form>

        {error && <p className="text-destructive text-sm">{error}</p>}
        {success && <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>}
      </div>

      {/* Sent Invites */}
      {sentInvites.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Sent Invitations</h2>
          {sentInvites.map((inv) => (
            <div key={inv.id} className="glass rounded-xl p-4 flex items-center justify-between slide-up">
              <div>
                <p className="font-medium text-sm">{inv.receiverEmail}</p>
                <p className="text-xs text-muted-foreground">Role: {inv.targetRole}</p>
              </div>
              <button
                onClick={() => revokeInvite(inv.id)}
                className="text-sm text-destructive hover:text-destructive/80 transition-colors btn-press"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Active Connections */}
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Active Connections</h2>
        {connections.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center text-muted-foreground text-sm slide-up">
            No connections yet. Send an invite to get started.
          </div>
        ) : (
          connections.map((conn) => (
            <div key={conn.id} className="glass rounded-xl p-4 flex items-center justify-between slide-up">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                  {conn.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{conn.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {conn.role === "FREELANCER" ? "Freelancer" : "Client"} · {conn.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={"/chat"}
                  className="text-sm bg-primary/10 text-primary rounded-lg px-3 py-1.5 hover:bg-primary/20 transition-colors btn-press"
                >
                  Message
                </Link>
                <button
                  onClick={() => disconnect(conn.id)}
                  className="text-sm text-destructive hover:text-destructive/80 transition-colors px-3 py-1.5 btn-press"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
