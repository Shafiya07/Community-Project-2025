import { getSupabase } from "./supabase";

const BOOKING_FIELDS = "id,worker_id,worker_name,worker_profession,customer_name,customer_phone,service,customer_note,preferred_date,status,created_at,updated_at";

function fail(error) {
  if (error) throw new Error(error.message || "The booking request failed.");
}

export async function getCustomerProfile(userId) {
  const { data, error } = await getSupabase().from("customer_profiles")
    .select("user_id,full_name,phone").eq("user_id", userId).maybeSingle();
  fail(error);
  return data;
}

export async function saveCustomerProfile(userId, values) {
  const payload = {
    user_id: userId,
    full_name: String(values.full_name || "").trim(),
    phone: String(values.phone || "").replace(/\D/g, "").slice(-10),
    updated_at: new Date().toISOString(),
  };
  if (!payload.full_name || payload.full_name.length > 100) throw new Error("Enter your name (up to 100 characters).");
  if (!/^[6-9]\d{9}$/.test(payload.phone)) throw new Error("Enter a valid 10-digit Indian mobile number.");
  const { data, error } = await getSupabase().from("customer_profiles")
    .upsert(payload, { onConflict: "user_id" }).select("user_id,full_name,phone").single();
  fail(error);
  return data;
}

export async function createBooking(booking) {
  const { data: { user }, error: authError } = await getSupabase().auth.getUser();
  fail(authError);
  if (!user) throw new Error("Sign in before booking a worker.");
  const { data, error } = await getSupabase().from("bookings").insert({ ...booking, customer_id: user.id })
    .select(BOOKING_FIELDS).single();
  fail(error);
  return data;
}

export async function getCustomerBookings() {
  const { data, error } = await getSupabase().from("bookings")
    .select(BOOKING_FIELDS).order("created_at", { ascending: false });
  fail(error);
  return data || [];
}

export async function getWorkerBookings(workerId) {
  const { data, error } = await getSupabase().from("bookings")
    .select(BOOKING_FIELDS).eq("worker_id", workerId).order("created_at", { ascending: false });
  fail(error);
  return data || [];
}

export async function updateBookingStatus(id, status) {
  const { data, error } = await getSupabase().from("bookings").update({ status })
    .eq("id", id).select(BOOKING_FIELDS).single();
  fail(error);
  return data;
}

export async function getBookingReviews(bookingIds, customerId) {
  if (!bookingIds.length) return [];
  const { data, error } = await getSupabase().from("reviews")
    .select("booking_id").eq("customer_id", customerId).in("booking_id", bookingIds);
  fail(error);
  return data || [];
}

export async function submitBookingReview(bookingId, rating, text) {
  const { data, error } = await getSupabase().rpc("submit_booking_review", {
    p_booking_id: bookingId,
    p_rating: Number(rating),
    p_text: String(text || "").trim(),
  });
  fail(error);
  return data;
}

export async function getWorkerCompletedBookingCount(workerId) {
  const { data, error } = await getSupabase().rpc("get_worker_completed_booking_count", { p_worker_id: workerId });
  fail(error);
  return Number(data || 0);
}
