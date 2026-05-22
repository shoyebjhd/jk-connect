import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const expired = searchParams.get("expired");
  const tokenParam = searchParams.get("token");
  const [isRegister, setIsRegister] = useState(false);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "CLIENT" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tokenParam) {
      setInviteLoading(true);
      fetch(`/api/network/invite/verify?token=${tokenParam}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error) {
            setError(data.error);
            return;
          }
          setInviteInfo(data);
          setForm((prev) => ({ ...prev, email: data.email, role: data.targetRole }));
          setIsRegister(true);
        })
        .catch(() => setError("Failed to verify invite token"))
        .finally(() => setInviteLoading(false));
    }
  }, [tokenParam]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let endpoint, body;
      if (tokenParam && inviteInfo) {
        endpoint = "/api/network/accept";
        body = { token: tokenParam, name: form.name, password: form.password };
      } else if (isRegister) {
        endpoint = "/api/auth/register";
        body = form;
      } else {
        endpoint = "/api/auth/login";
        body = { email: form.email, password: form.password };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      login(data.token);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (tokenParam && inviteLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-pulse text-muted-foreground">Verifying invite...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="bg-card p-8 rounded-xl border w-full max-w-md">
        <h1 className="font-extrabold text-2xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 text-center mb-6">
          JKAAS
        </h1>

        {expired && (
          <div className="mb-4 text-sm text-amber-600 bg-amber-500/10 rounded-lg px-4 py-2">
            Session expired. Please log in again.
          </div>
        )}

        {inviteInfo && (
          <div className="mb-4 text-sm text-green-600 bg-green-500/10 rounded-lg px-4 py-2">
            You were invited by {inviteInfo.senderName} as a {inviteInfo.targetRole}. Complete registration below.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 outline-none"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              readOnly={!!inviteInfo}
              className="w-full border rounded-lg px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 outline-none"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              className="w-full border rounded-lg px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 outline-none"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                disabled={!!inviteInfo}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="CLIENT">Client</option>
                <option value="FREELANCER">Freelancer</option>
              </select>
            </div>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2 hover:opacity-90 disabled:opacity-50 transition-all btn-press"
          >
            {loading ? "Loading..." : isRegister ? "Register" : "Login"}
          </button>
        </form>

        {!inviteInfo && (
          <p className="text-sm text-center mt-4 text-muted-foreground">
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
              className="text-primary hover:underline"
            >
              {isRegister ? "Login" : "Register"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
