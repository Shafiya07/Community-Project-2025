import { getSupabase } from "./supabase";

const REQUEST_FIELDS = "id,customer_id,customer_name,service,title,area,description,budget,desired_date,status,created_at";
function check(error) { if (error) throw new Error(error.message || "The request could not be completed."); }

export async function postWorkRequest(values, customerId) {
  const payload = {
    customer_id: customerId,
    customer_name: String(values.customer_name || "").trim().slice(0, 100),
    service: String(values.service || "").trim().slice(0, 100),
    title: String(values.title || "").trim().slice(0, 120),
    area: String(values.area || "").trim().slice(0, 160),
    description: String(values.description || "").trim().slice(0, 2000),
    budget: values.budget === "" ? null : Number(values.budget),
    desired_date: values.desired_date || null,
  };
  if (!payload.customer_name || !payload.service || payload.title.length < 3 || payload.area.length < 2 || payload.description.length < 10) {
    throw new Error("Please complete your name, service, title, area, and a 10-character work description.");
  }
  if (payload.budget !== null && (!Number.isFinite(payload.budget) || payload.budget < 0 || payload.budget > 5000000)) throw new Error("Enter a budget from ₹0 to ₹50,00,000.");
  const supabase = getSupabase();
  const { data, error } = await supabase.from("work_requests").insert(payload).select(REQUEST_FIELDS).single();
  check(error);
  const { data: matched, error: notifyError } = await supabase.rpc("notify_workers_for_work_request", { p_request_id: data.id });
  check(notifyError);
  return { ...data, notified_count: Number(matched || 0) };
}

export async function getCustomerWorkRequests() {
  const { data, error } = await getSupabase().from("work_requests").select(REQUEST_FIELDS).order("created_at", { ascending: false });
  check(error); return data || [];
}
export async function getWorkerWorkRequests(workerId) {
  const { data, error } = await getSupabase().from("work_request_notifications")
    .select(`id,request_id,read_at,created_at,work_requests!inner(${REQUEST_FIELDS})`)
    .eq("worker_id", workerId).order("created_at", { ascending: false });
  check(error); return (data || []).map((item) => ({ ...item.work_requests, notification_id: item.id, read_at: item.read_at }));
}
export async function markWorkRequestRead(notificationId) {
  const { error } = await getSupabase().from("work_request_notifications").update({ read_at: new Date().toISOString() }).eq("id", notificationId);
  check(error);
}
export async function getWorkRequestResponses(requestId) {
  const { data, error } = await getSupabase().from("work_request_responses")
    .select("id,request_id,worker_id,worker_user_id,worker_name,message,created_at").eq("request_id", requestId).order("created_at");
  check(error); return data || [];
}
export async function respondToWorkRequest(request, worker, message = "") {
  const { data, error } = await getSupabase().from("work_request_responses").insert({
    request_id: request.id, worker_id: worker.id, worker_user_id: worker.user_id,
    worker_name: worker.name, message: String(message).trim().slice(0, 1000),
  }).select("id,request_id,worker_id,worker_user_id,worker_name,message,created_at").single();
  check(error); return data;
}
export async function getWorkRequestMessages(requestId, otherUserId) {
  const { data, error } = await getSupabase().from("work_request_messages").select("id,request_id,sender_id,recipient_id,body,created_at")
    .eq("request_id", requestId).or(`sender_id.eq.${otherUserId},recipient_id.eq.${otherUserId}`).order("created_at");
  check(error); return data || [];
}
export async function sendWorkRequestMessage(requestId, senderId, recipientId, body) {
  const text = String(body || "").trim();
  if (!text || text.length > 2000) throw new Error("Message must be between 1 and 2,000 characters.");
  const { data, error } = await getSupabase().from("work_request_messages")
    .insert({ request_id: requestId, sender_id: senderId, recipient_id: recipientId, body: text })
    .select("id,request_id,sender_id,recipient_id,body,created_at").single();
  check(error); return data;
}
export async function updateWorkRequestStatus(requestId, status) {
  const { error } = await getSupabase().from("work_requests").update({ status }).eq("id", requestId);
  check(error);
}
