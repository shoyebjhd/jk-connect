import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Account() {
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api("/api/users/me");
        setProfile(data);
        setName(data.name);
        setEmail(data.email);
      } catch {}
    })();
  }, []);

  const handleProfile = async (e) => {
    e.preventDefault();
    setProfileMsg("");
    setProfileErr("");
    setSavingProfile(true);
    try {
      const data = await api("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ name, email }),
      });
      setProfile(data);
      setProfileMsg("Profile updated");
    } catch (err) {
      setProfileErr(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    setPwMsg("");
    setPwErr("");
    setSavingPw(true);
    try {
      await api("/api/users/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPwMsg("Password changed");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPwErr(err.message);
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">My Account</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 outline-none bg-background"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 outline-none bg-background"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {profileErr && <p className="text-destructive text-sm">{profileErr}</p>}
            {profileMsg && <p className="text-green-600 dark:text-green-400 text-sm">{profileMsg}</p>}
            <Button type="submit" disabled={savingProfile} className="btn-press">
              {savingProfile ? "Saving..." : "Save"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Current Password</label>
              <input
                type="password"
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 outline-none bg-background"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                className="w-full border rounded-lg px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary/50 outline-none bg-background"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            {pwErr && <p className="text-destructive text-sm">{pwErr}</p>}
            {pwMsg && <p className="text-green-600 dark:text-green-400 text-sm">{pwMsg}</p>}
            <Button type="submit" disabled={savingPw} className="btn-press">
              {savingPw ? "Changing..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">Role: {profile.role}</p>
    </div>
  );
}
