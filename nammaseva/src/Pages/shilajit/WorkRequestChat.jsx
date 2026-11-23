import React, { useCallback, useEffect, useState } from "react";
import { getWorkRequestMessages, sendWorkRequestMessage } from "../../api/workRequests";

export default function WorkRequestChat({ requestId, currentUserId, otherUserId, otherName }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const load = useCallback(async () => {
    try { setMessages(await getWorkRequestMessages(requestId, otherUserId)); setError(""); }
    catch (e) { setError(e.message || "Could not load messages."); }
  }, [requestId, otherUserId]);
  useEffect(() => { load(); const timer = window.setInterval(load, 6000); return () => window.clearInterval(timer); }, [load]);
  async function submit(event) {
    event.preventDefault(); if (!draft.trim()) return;
    setSending(true); setError("");
    try { await sendWorkRequestMessage(requestId, currentUserId, otherUserId, draft); setDraft(""); await load(); }
    catch (e) { setError(e.message || "Could not send this message."); }
    finally { setSending(false); }
  }
  return <section className="work-chat" aria-label={`Chat with ${otherName}`}>
    <div className="work-chat-heading"><strong>Private chat with {otherName}</strong><button type="button" onClick={load}>Refresh</button></div>
    {error && <p className="account-message account-error" role="alert">{error}</p>}
    <div className="work-chat-messages" aria-live="polite">{messages.length ? messages.map((m) => <p key={m.id} className={m.sender_id === currentUserId ? "work-chat-mine" : "work-chat-theirs"}><span>{m.body}</span><time>{new Date(m.created_at).toLocaleString()}</time></p>) : <p className="work-chat-empty">No messages yet. Send a message to coordinate details.</p>}</div>
    <form className="work-chat-form" onSubmit={submit}><label className="sr-only" htmlFor={`chat-${requestId}-${otherUserId}`}>Message</label><input id={`chat-${requestId}-${otherUserId}`} value={draft} maxLength="2000" onChange={(e) => setDraft(e.target.value)} placeholder="Write a message…"/><button className="button button-primary" disabled={sending || !draft.trim()}>{sending ? "Sending…" : "Send"}</button></form>
  </section>;
}
