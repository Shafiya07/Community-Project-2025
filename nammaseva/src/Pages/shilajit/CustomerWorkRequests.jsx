import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCustomerWorkRequests, getWorkRequestResponses, postWorkRequest, updateWorkRequestStatus } from "../../api/workRequests";
import WorkRequestChat from "./WorkRequestChat";

const blank = { customer_name: "", service: "", title: "", area: "", description: "", budget: "", desired_date: "" };
export default function CustomerWorkRequests({ user, profile }) {
  const [form, setForm] = useState({ ...blank, customer_name: profile?.full_name || "" });
  const [requests, setRequests] = useState([]);
  const [responses, setResponses] = useState({});
  const [activeChat, setActiveChat] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const rows = await getCustomerWorkRequests(); setRequests(rows);
    const replyGroups = await Promise.all(rows.map(async (row) => [row.id, await getWorkRequestResponses(row.id)]));
    setResponses(Object.fromEntries(replyGroups));
  }, []);
  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);
  useEffect(() => { const timer = window.setInterval(() => load().catch((e) => setError(e.message)), 15000); return () => window.clearInterval(timer); }, [load]);
  useEffect(() => { if (profile?.full_name && !form.customer_name) setForm((f) => ({ ...f, customer_name: profile.full_name })); }, [profile?.full_name]);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const posted = await postWorkRequest(form, user.id);
      setMessage(posted.notified_count ? `Request posted. ${posted.notified_count} matching available worker(s) were notified in their dashboard.` : "Request posted. No available worker matched this service and area yet; workers who match later will need a new post.");
      setForm({ ...blank, customer_name: profile?.full_name || form.customer_name }); await load();
    } catch (e) { setError(e.message || "Could not post this request."); }
    finally { setBusy(false); }
  }
  async function closeRequest(request, status) {
    try { await updateWorkRequestStatus(request.id, status); setMessage(status === "hired" ? "Request marked as hired." : "Request closed."); await load(); }
    catch (e) { setError(e.message || "Could not update request."); }
  }
  return <section id="work-requests" className="work-requests-section">
    <div className="customer-section-heading"><div><p className="eyebrow">LOCAL WORK REQUESTS</p><h2>Post a job & get replies</h2></div><span className="booking-count">{requests.length} posted</span></div>
    <p className="work-request-intro">Describe what you need, your area and budget. Available workers in that service and area will see an in-app alert. When they say they are interested, you can message privately.</p>
    {message && <p className="account-message account-success" role="status">{message}</p>}{error && <p className="account-message account-error" role="alert">{error}</p>}
    <form className="account-card work-request-form" onSubmit={submit}>
      <h3>What work do you need?</h3>
      <label>Your name<input required maxLength="100" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></label>
      <label>Service / worker type<input required maxLength="100" placeholder="e.g. Event Organizer, Electrician" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} /></label>
      <label>Short title<input required minLength="3" maxLength="120" placeholder="e.g. Need 3 event coordinators for a family function" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
      <label>Area / locality<input required maxLength="160" placeholder="e.g. Tumakuru, Siddaganga Extension" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></label>
      <label>Work details<textarea required minLength="10" maxLength="2000" rows="4" placeholder="Date, number of people, work needed, timings, materials…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <label>Budget / fee offer (₹, optional)<input type="number" min="0" max="5000000" step="1" placeholder="Your total budget or offer" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></label>
      <label>Preferred date (optional)<input type="date" min={new Date().toISOString().slice(0, 10)} value={form.desired_date} onChange={(e) => setForm({ ...form, desired_date: e.target.value })} /></label>
      <p className="work-request-privacy">Your full phone number is not posted publicly. Use the private chat to coordinate with workers who respond.</p>
      <button className="button button-primary" disabled={busy}>{busy ? "Posting…" : "Post work request"}</button>
    </form>
    <div className="work-request-list"><h3>Your posts and worker replies</h3>{requests.length ? requests.map((request) => <article className="booking-card work-request-card" key={request.id}>
      <div className="booking-card-top"><div><p className="eyebrow">{request.service} · {request.area}</p><h3>{request.title}</h3></div><span className={`booking-status status-${request.status === "open" ? "pending" : request.status === "hired" ? "accepted" : "cancelled"}`}>{request.status}</span></div>
      <p>{request.description}</p><p className="booking-meta">{request.budget !== null ? `Budget: ₹${Number(request.budget).toLocaleString("en-IN")}` : "Budget not specified"}{request.desired_date ? ` · Date: ${request.desired_date}` : ""} · Posted {new Date(request.created_at).toLocaleDateString()}</p>
      <div className="work-replies"><strong>{(responses[request.id] || []).length} worker response(s)</strong>{(responses[request.id] || []).map((reply) => <div className="work-reply" key={reply.id}><div><b>{reply.worker_name}</b>{reply.message && <p>{reply.message}</p>}</div><button className="button button-secondary" onClick={() => setActiveChat(activeChat?.responseId === reply.id ? null : { requestId: request.id, responseId: reply.id, userId: reply.worker_user_id, name: reply.worker_name })}>{activeChat?.responseId === reply.id ? "Close chat" : "Message worker"}</button>{activeChat?.responseId === reply.id && <WorkRequestChat requestId={request.id} currentUserId={user.id} otherUserId={reply.worker_user_id} otherName={reply.worker_name} />}</div>)}</div>
      {request.status === "open" && <div className="work-request-actions"><button className="button button-secondary" onClick={() => closeRequest(request, "hired")}>Mark worker hired</button><button className="button button-secondary" onClick={() => closeRequest(request, "closed")}>Close post</button></div>}
    </article>) : <p className="account-empty">Your work posts and worker replies will appear here.</p>}</div>
  </section>;
}
