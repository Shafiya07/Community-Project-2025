import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../../Components/shilajit/Navbar";
import { getSupabase } from "../../api/supabase";
import { getBookingReviews, getCustomerBookings, getCustomerProfile, saveCustomerProfile, submitBookingReview } from "../../api/bookings";
import "./WorkerAccount.css";

const statusLabel = {
  pending: "Waiting for worker",
  accepted: "Accepted",
  in_progress: "Work in progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function CustomerAccount() {
  const supabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
  const supabase = useMemo(() => (supabaseConfigured ? getSupabase() : null), [supabaseConfigured]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ full_name: "", phone: "" });
  const [bookings, setBookings] = useState([]);
  const [reviewed, setReviewed] = useState(new Set());
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAccount = useCallback(async () => {
    if (!supabase) return;
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError) throw authError;
    const signedInUser = session?.user || null;
    setUser(signedInUser || null);
    if (!signedInUser) { setBookings([]); return; }
    const [customerProfile, rows] = await Promise.all([getCustomerProfile(signedInUser.id), getCustomerBookings()]);
    setProfile({ full_name: customerProfile?.full_name || "", phone: customerProfile?.phone || "" });
    setBookings(rows);
    const reviewRows = await getBookingReviews(rows.map((booking) => booking.id), signedInUser.id);
    setReviewed(new Set(reviewRows.map((review) => review.booking_id)));
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    loadAccount().catch((loadError) => setError(loadError.message || "Could not load your account."));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (!session) { setBookings([]); setReviewed(new Set()); }
    });
    return () => subscription.unsubscribe();
  }, [loadAccount, supabase]);

  async function authenticate(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password });
        if (authError) throw authError;
        if (!data.session) {
          setMessage("Your account was created. Sign in to continue.");
        } else {
          await loadAccount();
          if (redirectTo) navigate(redirectTo);
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        await loadAccount();
        if (redirectTo) navigate(redirectTo);
      }
    } catch (authError) { setError(authError.message || "Sign-in failed."); }
    finally { setBusy(false); }
  }

  async function saveProfile(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const saved = await saveCustomerProfile(user.id, profile);
      setProfile(saved);
      setMessage("Your customer profile has been saved.");
    } catch (saveError) { setError(saveError.message || "Could not save your profile."); }
    finally { setBusy(false); }
  }

  async function leaveReview(event, booking) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const draft = reviewDrafts[booking.id] || { rating: "5", text: "" };
    try {
      await submitBookingReview(booking.id, draft.rating, draft.text);
      setMessage("Thanks! Your feedback is now visible on the worker profile.");
      await loadAccount();
    } catch (reviewError) { setError(reviewError.message || "Could not save your feedback."); }
    finally { setBusy(false); }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null); setBookings([]); setMessage("You are signed out.");
  }

  return <><Navbar /><main className="page-shell worker-account-shell customer-account-shell">
    <section className="page-heading"><p className="eyebrow">CUSTOMER ACCOUNT</p><h1>My account & bookings</h1><p>Keep your customer details, see every worker you booked, and follow each job to completion.</p></section>
    {error && <p className="account-message account-error" role="alert">{error}</p>}
    {message && <p className="account-message account-success" role="status">{message}</p>}
    {!supabase ? <section className="account-card account-auth"><h2>Accounts need setup</h2><p>Supabase is not configured on this deployment.</p></section> : !user ? <section className="account-card account-auth">
      <h2>{mode === "signin" ? "Sign in to your customer account" : "Create your customer account"}</h2>
      <p>Use one account to book local workers, track job progress, and leave feedback after completion.</p>
      <form onSubmit={authenticate}>
        <label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength="8" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button className="button button-primary" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
      </form>
      <button className="account-mode-toggle" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); }}>
        {mode === "signin" ? "New customer? Create an account" : "Already have an account? Sign in"}
      </button>
    </section> : <>
      <section className="account-card customer-profile-card">
        <div className="account-topline"><span>Signed in as {user.email}</span><button className="account-mode-toggle" onClick={signOut}>Sign out</button></div>
        <h2>Your customer profile</h2>
        <form className="customer-profile-form" onSubmit={saveProfile}>
          <label>Full name<input required maxLength="100" value={profile.full_name} onChange={(event) => setProfile({ ...profile, full_name: event.target.value })} /></label>
          <label>Mobile number<input required inputMode="numeric" maxLength="10" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value.replace(/\D/g, "").slice(0, 10) })} /></label>
          <button className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Save customer profile"}</button>
        </form>
      </section>
      <section className="customer-bookings-section">
        <div className="customer-section-heading"><div><p className="eyebrow">YOUR SERVICE HISTORY</p><h2>My bookings</h2></div><Link className="button button-secondary" to="/workers">Find a worker</Link></div>
        {!bookings.length ? <div className="account-card account-empty"><h2>No bookings yet</h2><p>Your worker bookings and their progress will appear here.</p><Link className="button button-primary" to="/workers">Browse workers →</Link></div> : <div className="booking-list">
          {bookings.map((booking) => <article className="booking-card" key={booking.id}>
            <div className="booking-card-top"><div><p className="eyebrow">{booking.service}</p><h3>{booking.worker_name}</h3><p>{booking.worker_profession}</p></div><span className={`booking-status status-${booking.status}`}>{statusLabel[booking.status] || booking.status}</span></div>
            <p className="booking-meta">Booked {new Date(booking.created_at).toLocaleDateString()} {booking.preferred_date ? `· Requested date ${booking.preferred_date}` : ""}</p>
            {booking.customer_note && <p className="booking-note">{booking.customer_note}</p>}
            {booking.status === "completed" && !reviewed.has(booking.id) && <form className="booking-review-form" onSubmit={(event) => leaveReview(event, booking)}>
              <h4>Work complete? Leave feedback</h4>
              <label>Rating<select value={reviewDrafts[booking.id]?.rating || "5"} onChange={(event) => setReviewDrafts({ ...reviewDrafts, [booking.id]: { ...reviewDrafts[booking.id], rating: event.target.value } })}><option value="5">★★★★★ Excellent</option><option value="4">★★★★☆ Good</option><option value="3">★★★☆☆ Okay</option><option value="2">★★☆☆☆ Poor</option><option value="1">★☆☆☆☆ Very poor</option></select></label>
              <label>Your feedback<textarea rows="3" maxLength="1000" placeholder="How was your experience?" value={reviewDrafts[booking.id]?.text || ""} onChange={(event) => setReviewDrafts({ ...reviewDrafts, [booking.id]: { ...reviewDrafts[booking.id], text: event.target.value } })} /></label>
              <button className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Submit feedback"}</button>
            </form>}
            {reviewed.has(booking.id) && <p className="review-submitted" role="status">Feedback submitted and shown on the worker profile.</p>}
            {booking.worker_id && <Link className="booking-profile-link" to={`/workers/${booking.worker_id}`}>View worker profile →</Link>}
          </article>)}
        </div>}
      </section>
    </>}
  </main></>;
}
