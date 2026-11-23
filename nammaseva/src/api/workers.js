import { getSupabase } from "./supabase";

const WORKER_FIELDS = "id,name,phone,profession,skills,experience,service_areas,description,languages,working_hours,pricing,photo_path,published_contact,status,availability_status,verified,created_at";

function throwOnError(error) {
  if (error) throw new Error(error.message || "The directory request failed.");
}

async function addPhotoUrls(workers) {
  const supabase = getSupabase();
  return Promise.all(workers.map(async (worker) => {
    if (!worker.photo_path) return { ...worker, photo: "" };
    const { data, error } = await supabase.storage
      .from("worker-photos")
      .createSignedUrl(worker.photo_path, 3600);
    throwOnError(error);
    return { ...worker, photo: data.signedUrl };
  }));
}

function toWorker(worker) {
  return {
    id: worker.id,
    name: worker.name,
    phone: worker.phone,
    profession: worker.profession,
    skills: worker.skills || [],
    experience: worker.experience,
    serviceAreas: worker.service_areas || [],
    description: worker.description,
    languages: worker.languages || [],
    workingHours: worker.working_hours || "",
    pricing: worker.pricing || "",
    photo: "",
    publishedContact: worker.published_contact,
    status: worker.status,
    availabilityStatus: worker.availability_status || "available",
    verified: worker.verified,
    createdAt: worker.created_at,
    photo_path: worker.photo_path,
  };
}

export async function getWorkers() {
  const { data, error } = await getSupabase()
    .from("workers")
    .select(WORKER_FIELDS)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  throwOnError(error);
  return addPhotoUrls((data || []).map(toWorker));
}

export async function getWorker(id) {
  const { data, error } = await getSupabase()
    .from("workers")
    .select(WORKER_FIELDS)
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();
  throwOnError(error);
  if (!data) throw new Error("Worker profile not found.");
  return (await addPhotoUrls([toWorker(data)]))[0];
}

export async function getReviews() {
  const { data, error } = await getSupabase()
    .from("reviews")
    .select("id,worker_id,rating,text,customer_name,created_at,status")
    .eq("status", "approved");
  throwOnError(error);
  return (data || []).map((review) => ({
    id: review.id,
    workerId: review.worker_id,
    rating: review.rating,
    text: review.text,
    customerName: review.customer_name,
    createdAt: review.created_at,
    status: review.status,
  }));
}

export async function createWorker(worker, photo, turnstileToken) {
  const { data: { session } } = await getSupabase().auth.getSession();
  if (!session?.access_token) throw new Error("Please sign in or create your worker account before registering.");
  if (import.meta.env.PROD) {
    const photoData = photo ? await fileToPayload(photo) : null;
    const response = await fetch("/api/register-worker", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ worker, photo: photoData, turnstileToken }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Registration could not be submitted.");
    return result;
  }

  throw new Error("For local registration testing, run the app with `vercel dev` and configure the required environment variables.");
}

function fileToPayload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("The selected photo could not be read."));
        return;
      }
      resolve({ name: file.name, type: file.type, base64 });
    };
    reader.onerror = () => reject(new Error("The selected photo could not be read."));
    reader.readAsDataURL(file);
  });
}

export async function getPendingWorkers() {
  const supabase = getSupabase();
  const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");
  throwOnError(roleError);
  if (!isAdmin) throw new Error("This account is not authorized to review worker applications.");
  const { data, error } = await supabase
    .from("workers")
    .select(WORKER_FIELDS)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  throwOnError(error);
  const workers = (data || []).map(toWorker);
  return addPhotoUrls(workers);
}

export async function updateWorkerStatus(id, status) {
  if (!["approved", "rejected"].includes(status)) throw new Error("Invalid review decision.");
  const { data, error } = await getSupabase()
    .from("workers")
    .update({ status })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  throwOnError(error);
  if (!data) throw new Error("This application has already been reviewed or is unavailable.");
  return data;
}

export function isValidIndianMobile(phone) {
  return /^[6-9]\d{9}$/.test(String(phone || "").replace(/\D/g, ""));
}

export function normalizeMobile(phone) {
  return String(phone || "").replace(/\D/g, "").slice(-10);
}

export function averageRating(reviews, workerId) {
  const approved = reviews.filter(
    (review) => String(review.workerId) === String(workerId) &&
      review.status === "approved" &&
      Number(review.rating) >= 1 &&
      Number(review.rating) <= 5
  );
  if (!approved.length) return null;
  const average = approved.reduce((total, review) => total + Number(review.rating || 0), 0) / approved.length;
  return { average: Math.round(average * 10) / 10, count: approved.length };
}
