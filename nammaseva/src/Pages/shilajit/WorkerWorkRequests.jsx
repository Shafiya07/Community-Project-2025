import React, { useCallback, useEffect, useState } from "react";
import { getWorkerWorkRequests, getWorkRequestResponses, markWorkRequestRead, respondToWorkRequest } from "../../api/workRequests";
import WorkRequestChat from "./WorkRequestChat";

export default function WorkerWorkRequests({ worker, user }) {
  const [requests, setRequests] = useState([]);
  const [responses, setResponses] = useState({});
  const [activeChat, setActiveChat] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const load = useCallback(async () => {
    const rows = await getWorkerWorkRequests(worker.id); setRequests(rows);
    const pairs = await Promise.all(rows.map(async (row) => [row.id, await getWorkRequestResponses(row.id)]));
    setResponses(Object.fromEntries(pairs));
  }, [worker.id]);
  useEffect(() => { load().catch((e) => setError(e.message || "Could not load local work requests.")); }, [load]);
  useEffect(() => { const timer = window.setInterval(() => load().catch((e) => setError(e.message || "Could not refresh work requests.")), 15000); return () => window.clearInterval(timer); }, [load]);
  async function markRead(row) {
    if (row.read_at) return;
    try { await markWorkRequestRead(row.notification_id); setRequests((items) => items.map((item) => item.id === row.id ? { ...item, read_at: new Date().toISOString() } : item)); }
    catch (e) { setError(e.message || "Could not update notification."); }
  }
  async function interest(row) {
    setBusyId(row.id); setError("");
    try { await respondToWorkRequest(row, worker, "I’m interested and available to discuss this work."); await load(); setActiveChat(row.id); }
    catch (e) { setError(e.message || "Could not send your response. You may have already replied."); }
    finally { setBusyId(""); }
  }
  return <section className="work-requests-section worker-work-requests">
    <div className="customer-section-heading"><div><p className="eyebrow">LOCAL OPPORTUNITIES</p><h2>Customer work requests</h2></div><span className="booking-count">{requests.filter((r) => !r.read_at).length} new · {requests.length} total</span></div>
    <p className="work-request-intro">Customers post upcoming work in your service area. Respond if you are available; a private chat opens with the customer.</p>
    {error && <p className="account-message account-error" role="alert">{error}</p>}
    {requests.length ? <div className="booking-list">{requests.map((row) => {
      const ownResponse = (responses[row.id] || []).find((reply) => reply.worker_user_id === user.id);
      return <article className={`booking-card work-request-card${row.read_at ? "" : " work-request-unread"}`} key={row.id} onMouseEnter={() => markRead(row)}>
        <div className="booking-card-top"><div><p className="eyebrow">{row.service} · {row.area}</p><h3>{row.title}</h3><p>Customer: {row.customer_name}</p></div><span className={`booking-status status-${row.status === "open" ? "pending" : row.status === "hired" ? "accepted" : "cancelled"}`}>{row.status === "open" ? "Open" : row.status}</span></div>
        <p>{row.description}</p><p className="booking-meta">{row.budget !== null ? `Budget / offer: ₹${Number(row.budget).toLocaleString("en-IN")}` : "Budget not specified"}{row.desired_date ? ` · Preferred date: ${row.desired_date}` : ""}</p>
        {row.status === "open" && !ownResponse && <button className="button button-primary" disabled={busyId === row.id} onClick={() => interest(row)}>{busyId === row.id ? "Sending…" : "I’m available — respond"}</button>}
        {ownResponse && <><p className="work-interest-note">You responded {new Date(ownResponse.created_at).toLocaleDateString()}. The customer can now message you.</p><button className="button button-secondary" onClick={() => setActiveChat(activeChat === row.id ? "" : row.id)}>{activeChat === row.id ? "Close chat" : "Open private chat"}</button>{activeChat === row.id && <WorkRequestChat requestId={row.id} currentUserId={user.id} otherUserId={row.customer_id} otherName={row.customer_name} />}</>}
      </article>;
    })}</div> : <div className="account-card account-empty"><h3>No matching posts yet</h3><p>New customer requests for {worker.profession} around {Array.isArray(worker.service_areas) ? worker.service_areas.join(", ") : "your area"} appear here.</p></div>}
  </section>;
}
