import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../../Components/shilajit/Navbar";
import { createBooking, getCustomerProfile, saveCustomerProfile } from "../../api/bookings";
import { getSupabase } from "../../api/supabase";
import { getWorker } from "../../api/workers";
import { getDemoWorker } from "../../data/demoWorkers";
import "./WorkerAccount.css";

export default function BookingRequest() {
  const { workerId } = useParams();
  const navigate = useNavigate();
  const supabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
  const supabase = useMemo(() => (supabaseConfigured ? getSupabase() : null), [supabaseConfigured]);
  const [worker, setWorker] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ full_name: "", phone: "" });
  const [preferredDate, setPreferredDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    const demoWorker = getDemoWorker(workerId);
    if (demoWorker) { setWorker(demoWorker); return () => { active = false; }; }
    getWorker(workerId).then((record) => { if (active) setWorker(record); }).catch(() => { if (active) setWorker(false); });
    return () => { active = false; };
  }, [workerId]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    Promise.all([supabase.auth.getUser()]).then(async ([{ data: { user: signedInUser } }]) => {
      if (!active) return;
      setUser(signedInUser || null);
      if (signedInUser) {
        const savedProfile = await getCustomerProfile(signedInUser.id);
        if (active && savedProfile) setProfile({ full_name: savedProfile.full_name || "", phone: savedProfile.phone || "" });
      }
    }).catch((authError) => { if (active) setError(authError.message || "Could not check your account."); });
    return () => { active = false; };
  }, [supabase]);

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess(false);
    try {
      if (!user) throw new Error("Create a customer account or sign in before booking.");
      const savedProfile = await saveCustomerProfile(user.id, profile);
      await createBooking({
        worker_id: worker.id,
        worker_name: worker.name,
        worker_profession: worker.profession,
        customer_name: savedProfile.full_name,
        customer_phone: savedProfile.phone,
        service: worker.profession,
        customer_note: note.trim(),
        preferred_date: preferredDate || null,
      });
      setSuccess(true);
    } catch (bookingError) { setError(bookingError.message || "Could not create your booking."); }
    finally { setBusy(false); }
  }

  return <><Navbar /><main className="page-shell booking-request-shell">
    <section className="page-heading"><p className="eyebrow">SERVICE REQUEST</p><h1>Book a local worker</h1><p>Your request and its progress will be saved in your account.</p></section>
    {error && <p className="account-message account-error" role="alert">{error}</p>}
    {success ? <section className="account-card account-empty booking-success"><p className="eyebrow">REQUEST SENT</p><h2>Your booking is waiting for the worker</h2><p>Track updates and leave feedback after the job is complete in your customer account.</p><button className="button button-primary" onClick={() => navigate("/my-account")}>View my bookings →</button></section> : !worker ? worker === false ? <section className="empty-state"><h1>Worker not found</h1><Link className="button button-secondary" to="/workers">Find another worker</Link></section> : <p className="notice">Loading worker…</p> : worker.isDemo ? <section className="account-card account-empty"><h2>Sample profile</h2><p>Demo workers cannot receive real bookings. Choose a registered worker from the directory.</p><Link className="button button-secondary" to="/workers">Find registered workers →</Link></section> : <div className="booking-request-grid">
      <section className="account-card booking-worker-summary"><p className="eyebrow">YOUR WORKER</p><h2>{worker.name}</h2><p>{worker.profession}</p><p>{worker.serviceAreas?.join?.(", ") || worker.serviceAreas}</p><Link to={`/workers/${worker.id}`}>View profile</Link></section>
      <section className="account-card">
        {!user ? <div className="account-empty"><h2>Sign in to book</h2><p>Your bookings need a customer account so you can see status updates and leave feedback.</p><Link className="button button-primary" to={`/my-account?redirect=${encodeURIComponent(`/book/${worker.id}`)}`}>Sign in or create account →</Link></div> : <form className="booking-form" onSubmit={submit}>
          <h2>Booking details</h2>
          <label>Your name<input required maxLength="100" value={profile.full_name} onChange={(event) => setProfile({ ...profile, full_name: event.target.value })} /></label>
          <label>Mobile number<input required inputMode="numeric" maxLength="10" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value.replace(/\D/g, "").slice(0, 10) })} /></label>
          <label>Preferred date (optional)<input type="date" min={new Date().toISOString().slice(0, 10)} value={preferredDate} onChange={(event) => setPreferredDate(event.target.value)} /></label>
          <label>What work do you need?<textarea rows="4" maxLength="1000" placeholder="Describe the repair or service you discussed…" value={note} onChange={(event) => setNote(event.target.value)} /></label>
          <button className="button button-primary" disabled={busy}>{busy ? "Sending request…" : "Confirm booking request"}</button>
          <p className="booking-privacy-note">Your name and mobile number are shared with this worker for this booking.</p>
        </form>}
      </section>
    </div>}
  </main></>;
}
