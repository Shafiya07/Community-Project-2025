import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../Components/shilajit/Navbar";
import { getSupabase } from "../../api/supabase";
import "./WorkerAccount.css";

const editableFields = [
  ["name", "Full name"], ["phone", "Mobile number"], ["profession", "Profession"],
  ["experience", "Years of experience"], ["service_areas", "Service areas (comma separated)"],
  ["skills", "Skills (comma separated)"], ["languages", "Languages (comma separated)"],
  ["working_hours", "Working hours"], ["pricing", "Pricing"], ["description", "About your work"],
];
const listFields = new Set(["service_areas", "skills", "languages"]);
const asList = (value) => (Array.isArray(value) ? value.join(", ") : value || "");

export default function WorkerAccount() {
  const supabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
  const supabase = useMemo(() => (supabaseConfigured ? getSupabase() : null), [supabaseConfigured]);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [worker, setWorker] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [form, setForm] = useState({});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    if (!supabase) return;
    setError("");
    try {
      const { data: { user: signedInUser }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      setUser(signedInUser || null);
      if (!signedInUser) { setWorker(null); return; }
      const { data, error: workerError } = await supabase.from("workers")
        .select("id,name,phone,profession,skills,experience,service_areas,description,languages,working_hours,pricing,photo_path,published_contact,status,verified,created_at")
        .eq("user_id", signedInUser.id).maybeSingle();
      if (workerError) throw workerError;
      setWorker(data || null);
      if (!data) return;
      setForm(data);
      const [{ data: reviewRows, error: reviewError }, photoResult] = await Promise.all([
        supabase.from("reviews").select("id,rating,text,created_at").eq("worker_id", data.id).eq("status", "approved").order("created_at", { ascending: false }),
        data.photo_path ? supabase.storage.from("worker-photos").createSignedUrl(data.photo_path, 3600) : Promise.resolve({ data: null, error: null }),
      ]);
      if (reviewError) throw reviewError;
      if (photoResult.error) throw photoResult.error;
      setReviews(reviewRows || []);
      setWorker({ ...data, photoUrl: photoResult.data?.signedUrl || "" });
    } catch (loadError) { setError(loadError.message || "Could not load your profile."); }
  }, [supabase]);

  useEffect(() => { if (supabase) loadProfile(); }, [loadProfile, supabase]);

  async function authenticate(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password });
        if (authError) throw authError;
        if (!data.session) setMessage("Account created. Check your email to confirm it, then sign in here.");
        else { setMessage("Account created. You can now register your worker profile."); await loadProfile(); }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        await loadProfile();
      }
    } catch (authError) { setError(authError.message || "Sign-in failed."); }
    finally { setBusy(false); }
  }

  async function saveProfile(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const updates = {};
      for (const [field] of editableFields) {
        const raw = form[field];
        updates[field] = listFields.has(field)
          ? String(asList(raw)).split(",").map((item) => item.trim()).filter(Boolean)
          : field === "experience" ? Number(raw) : String(raw || "").trim();
      }
      if (photo) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type) || photo.size > 2 * 1024 * 1024) {
          throw new Error("Choose a JPEG, PNG, or WebP photo smaller than 2 MB.");
        }
        const extension = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
        const path = `${worker.id}/profile.${extension}`;
        const { error: uploadError } = await supabase.storage.from("worker-photos").upload(path, photo, { upsert: true, contentType: photo.type });
        if (uploadError) throw uploadError;
        updates.photo_path = path;
      }
      const { error: updateError } = await supabase.from("workers").update(updates).eq("id", worker.id);
      if (updateError) throw updateError;
      if (photo && worker.photo_path && worker.photo_path !== updates.photo_path) {
        const { error: cleanupError } = await supabase.storage.from("worker-photos").remove([worker.photo_path]);
        if (cleanupError) console.warn("Old profile photo cleanup failed:", cleanupError.message);
      }
      setPhoto(null); setMessage("Your profile has been updated."); await loadProfile();
    } catch (saveError) { setError(saveError.message || "Could not save your profile."); }
    finally { setBusy(false); }
  }

  async function deleteProfile() {
    if (!window.confirm("Delete your worker profile? This also removes its published reviews and cannot be undone.")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if (worker.photo_path) {
        const { error: photoError } = await supabase.storage.from("worker-photos").remove([worker.photo_path]);
        if (photoError) throw photoError;
      }
      const { error: deleteError } = await supabase.from("workers").delete().eq("id", worker.id);
      if (deleteError) throw deleteError;
      await supabase.auth.signOut(); navigate("/");
    } catch (deleteError) { setError(deleteError.message || "Could not delete your profile."); }
    finally { setBusy(false); }
  }

  async function signOut() { await supabase.auth.signOut(); setUser(null); setWorker(null); setMessage("You are signed out."); }

  return <><Navbar /><main className="page-shell worker-account-shell">
    <section className="page-heading"><p className="eyebrow">WORKER DASHBOARD</p><h1>My worker profile</h1><p>Manage your public details, location, profile photo, and customer feedback.</p></section>
    {error && <p className="account-message account-error" role="alert">{error}</p>}
    {message && <p className="account-message account-success" role="status">{message}</p>}
    {!supabase ? <section className="account-card account-auth"><h2>Profile accounts need setup</h2><p>This site is online, but its Supabase connection is not configured yet. Add the Supabase URL and anon key in Vercel Environment Variables, then redeploy to enable worker sign-in and profile management.</p></section> : !user ? <section className="account-card account-auth">
      <h2>{mode === "signin" ? "Sign in to your account" : "Create a worker account"}</h2>
      <p>Your account keeps your worker profile private to you until it is approved for the directory.</p>
      <form onSubmit={authenticate}>
        <label>Email<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength="8" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button className="button button-primary" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
      </form>
      <button className="account-mode-toggle" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); }}>
        {mode === "signin" ? "New worker? Create an account" : "Already registered? Sign in"}
      </button>
    </section> : <section className="account-card">
      <div className="account-topline"><span>Signed in as {user.email}</span><button className="account-mode-toggle" onClick={signOut}>Sign out</button></div>
      {!worker ? <div className="account-empty"><h2>Your worker profile is ready to be set up</h2><p>Complete the worker registration form to create your listing. It will appear here afterward so you can manage it.</p><Link className="button button-primary" to="/register">Register your worker profile →</Link></div> :
        <>
          <div className="account-profile-heading">
            {worker.photoUrl ? <img src={worker.photoUrl} alt={`${worker.name} profile`} /> : <div className="account-avatar" aria-hidden="true">{worker.name?.slice(0, 1)}</div>}
            <div><h2>{worker.name}</h2><p>{worker.profession} · <span className={`worker-status status-${worker.status}`}>{worker.status}</span></p></div>
          </div>
          <form className="account-edit-form" onSubmit={saveProfile}>
            {editableFields.map(([field, label]) => <label key={field} className={field === "description" ? "account-span" : ""}>{label}
              {field === "description" ? <textarea rows="4" maxLength="500" value={form[field] || ""} onChange={(e) => setForm({ ...form, [field]: e.target.value })} required /> :
                <input type={field === "experience" ? "number" : "text"} min={field === "experience" ? "0" : undefined} value={asList(form[field])} onChange={(e) => setForm({ ...form, [field]: e.target.value })} required={["name", "phone", "profession", "experience", "service_areas", "languages"].includes(field)} />}
            </label>)}
            <label className="account-span">Change profile photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] || null)} /><small>JPEG, PNG, or WebP · max 2 MB</small></label>
            <div className="account-span account-actions"><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button><button type="button" className="account-delete" disabled={busy} onClick={deleteProfile}>Delete my profile</button></div>
          </form>
          <section className="account-feedback"><h2>Customer feedback</h2>{reviews.length ? reviews.map((review) => <article key={review.id}><strong>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)} <time>{new Date(review.created_at).toLocaleDateString()}</time></strong><p>{review.text || "Rating only"}</p></article>) : <p>No approved feedback yet. Customer reviews will appear here.</p>}</section>
        </>}
    </section>}
  </main></>;
}
