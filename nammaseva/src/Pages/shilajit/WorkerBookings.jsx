import React, { useEffect, useState } from "react";
import { getWorkerBookings, updateBookingStatus } from "../../api/bookings";

const labels = { pending: "New request", accepted: "Accepted", in_progress: "Work in progress", completed: "Completed", cancelled: "Cancelled" };
const nextStep = { pending: ["accepted", "Accept booking"], accepted: ["in_progress", "Start work"], in_progress: ["completed", "Mark work complete"] };

export default function WorkerBookings({ workerId }) {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  async function load() {
    try { setBookings(await getWorkerBookings(workerId)); setError(""); }
    catch (loadError) { setError(loadError.message || "Could not load bookings."); }
  }
  useEffect(() => { load(); }, [workerId]);

  async function advance(booking, status) {
    setBusyId(booking.id); setError("");
    try {
      await updateBookingStatus(booking.id, status);
      await load();
    } catch (updateError) { setError(updateError.message || "Could not update this booking."); }
    finally { setBusyId(""); }
  }

  return <section className="worker-bookings account-feedback">
    <div className="customer-section-heading"><div><p className="eyebrow">WORK REQUESTS</p><h2>Customer bookings</h2></div><span className="booking-count">{bookings.length} total</span></div>
    {error && <p className="account-message account-error" role="alert">{error}</p>}
    {!bookings.length ? <p>New customer booking requests will appear here.</p> : <div className="booking-list">
      {bookings.map((booking) => <article className="booking-card" key={booking.id}>
        <div className="booking-card-top"><div><p className="eyebrow">{booking.service}</p><h3>{booking.customer_name}</h3><p><a href={`tel:+91${booking.customer_phone}`}>{booking.customer_phone}</a></p></div><span className={`booking-status status-${booking.status}`}>{labels[booking.status] || booking.status}</span></div>
        {booking.preferred_date && <p className="booking-meta">Preferred date: {booking.preferred_date}</p>}
        {booking.customer_note && <p className="booking-note">{booking.customer_note}</p>}
        {nextStep[booking.status] && <div className="booking-worker-actions"><button className="button button-primary" disabled={busyId === booking.id} onClick={() => advance(booking, nextStep[booking.status][0])}>{busyId === booking.id ? "Updating…" : nextStep[booking.status][1]}</button>{booking.status !== "in_progress" && <button className="booking-cancel-button" disabled={busyId === booking.id} onClick={() => advance(booking, "cancelled")}>Cancel request</button>}</div>}
      </article>)}
    </div>}
  </section>;
}
