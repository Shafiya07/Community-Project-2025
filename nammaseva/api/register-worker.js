const crypto = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Map([
  ["image/jpeg", { extension: "jpg", signature: (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff }],
  ["image/png", { extension: "png", signature: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) }],
  ["image/webp", { extension: "webp", signature: (buffer) => buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" }],
]);

class ValidationError extends Error {}

class ServiceUnavailableError extends Error {}

function respond(response, status, body) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  return response.status(status).json(body);
}

function normalizeList(value, maxLength, maxItemLength) {
  if (!Array.isArray(value)) return [];
  const items = value.slice(0, maxLength).map((item) => String(item).trim()).filter(Boolean);
  if (items.some((item) => item.length > maxItemLength)) {
    throw new ValidationError("One of the service details is too long.");
  }
  return items;
}

function validateWorker(input) {
  const worker = input && typeof input === "object" ? input : {};
  const name = String(worker.name || "").trim();
  const phone = String(worker.phone || "").replace(/\D/g, "").slice(-10);
  const profession = String(worker.profession || "").trim();
  const experience = Number(worker.experience);
  const serviceAreas = normalizeList(worker.serviceAreas, 20, 100);
  const languages = normalizeList(worker.languages, 10, 50);
  const description = String(worker.description || "").trim();

  if (!name || name.length > 100) throw new ValidationError("Enter a name of up to 100 characters.");
  if (!/^[6-9]\d{9}$/.test(phone)) throw new ValidationError("Enter a valid 10-digit Indian mobile number.");
  if (!profession || profession.length > 100) throw new ValidationError("Choose a valid profession.");
  if (!Number.isInteger(experience) || experience < 0 || experience > 80) throw new ValidationError("Enter valid years of experience.");
  if (!serviceAreas.length) throw new ValidationError("Add at least one service area.");
  if (!languages.length) throw new ValidationError("Add at least one spoken language.");
  if (!description || description.length > 500) throw new ValidationError("Add a description of up to 500 characters.");
  if (worker.publishedContact !== true) throw new ValidationError("Consent to publish contact details is required.");

  return {
    name,
    phone,
    profession,
    skills: normalizeList(worker.skills, 20, 100),
    experience,
    service_areas: serviceAreas,
    description,
    languages,
    working_hours: String(worker.workingHours || "").trim().slice(0, 100),
    pricing: String(worker.pricing || "").trim().slice(0, 200),
    published_contact: true,
    status: "approved",
    verified: false,
  };
}

function parsePhoto(photo) {
  if (!photo) return null;
  if (typeof photo.base64 !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(photo.base64)) {
    throw new ValidationError("The profile photo could not be read.");
  }
  const buffer = Buffer.from(photo.base64, "base64");
  if (!buffer.length || buffer.length > MAX_PHOTO_BYTES) {
    throw new ValidationError("Choose a profile photo smaller than 2 MB.");
  }
  const type = ALLOWED_PHOTO_TYPES.get(String(photo.type || "").toLowerCase());
  if (!type || !type.signature(buffer)) {
    throw new ValidationError("Upload a valid JPEG, PNG, or WebP profile photo.");
  }
  return { buffer, contentType: String(photo.type).toLowerCase(), extension: type.extension };
}

async function verifyTurnstile(token, remoteIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const expectedHostname = process.env.PUBLIC_SITE_HOSTNAME;
  if (!secret || !expectedHostname) throw new ServiceUnavailableError("Registration protection is not configured.");
  if (typeof token !== "string" || token.length < 1 || token.length > 2048) {
    throw new ValidationError("Complete the anti-spam check and try again.");
  }

  const form = new URLSearchParams({ secret, response: token });
  if (remoteIp) form.set("remoteip", remoteIp);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!response.ok) throw new ServiceUnavailableError("The anti-spam service is temporarily unavailable.");
  const result = await response.json();
  if (
    result.success !== true ||
    String(result.hostname || "").toLowerCase() !== expectedHostname.toLowerCase() ||
    result.action !== "worker_registration"
  ) {
    throw new ValidationError("The anti-spam check could not be verified. Please try again.");
  }
}

module.exports = async function registerWorker(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return respond(response, 405, { error: "Method not allowed." });
  }

  const requiredEnvironment = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "TURNSTILE_SECRET_KEY",
    "PUBLIC_SITE_HOSTNAME",
    "RATE_LIMIT_SECRET",
  ];
  if (requiredEnvironment.some((key) => !process.env[key])) {
    return respond(response, 503, { error: "Worker registration is not configured yet." });
  }

  if (Buffer.byteLength(JSON.stringify(request.body || {})) > 3 * 1024 * 1024) {
    return respond(response, 413, { error: "The registration is too large. Please use a smaller photo." });
  }

  let record;
  let photo;
  try {
    const accessToken = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!accessToken) return respond(response, 401, { error: "Sign in to your worker account before registering." });
    const authClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken);
    if (authError || !user) return respond(response, 401, { error: "Your session expired. Please sign in again." });

    record = validateWorker(request.body?.worker);
    photo = parsePhoto(request.body?.photo);
    const forwardedFor = request.headers["x-vercel-forwarded-for"] || request.headers["x-forwarded-for"];
    const remoteIp = String(forwardedFor || "").split(",")[0].trim();
    if (!remoteIp) return respond(response, 503, { error: "Registration could not identify the request source." });

    await verifyTurnstile(request.body?.turnstileToken, remoteIp);

    const supabase = authClient;
    const { data: existingWorker, error: existingError } = await supabase.from("workers").select("id").eq("user_id", user.id).maybeSingle();
    if (existingError) throw existingError;
    if (existingWorker) return respond(response, 409, { error: "A worker profile already exists for this account. Manage it from My profile." });
    const ipHash = crypto.createHmac("sha256", process.env.RATE_LIMIT_SECRET).update(remoteIp).digest("hex");
    const { data: allowed, error: limitError } = await supabase.rpc("consume_registration_slot", { p_ip_hash: ipHash });
    if (limitError) {
      console.error("Registration rate-limit check failed:", limitError.message);
      return respond(response, 503, { error: "Registration is temporarily unavailable. Please try again later." });
    }
    if (!allowed) return respond(response, 429, { error: "Too many registration attempts. Please try again tomorrow." });

    const id = crypto.randomUUID();
    let photoPath = null;
    if (photo) {
      photoPath = `${id}/profile.${photo.extension}`;
      const { error: uploadError } = await supabase.storage
        .from("worker-photos")
        .upload(photoPath, photo.buffer, { contentType: photo.contentType, upsert: false });
      if (uploadError) {
        console.error("Worker photo upload failed:", uploadError.message);
        return respond(response, 502, { error: "The profile photo could not be saved. Please try again." });
      }
    }

    const { error: insertError } = await supabase.from("workers").insert({
      id,
      user_id: user.id,
      ...record,
      photo_path: photoPath,
    });
    if (insertError) {
      console.error("Worker registration insert failed:", insertError.message);
      if (photoPath) {
        const { error: cleanupError } = await supabase.storage.from("worker-photos").remove([photoPath]);
        if (cleanupError) console.error("Unattached worker photo cleanup failed:", cleanupError.message);
      }
      return respond(response, 500, { error: "Your registration could not be saved. Please try again." });
    }

    return respond(response, 201, { id, status: "approved" });
  } catch (error) {
    if (error instanceof ValidationError) return respond(response, 400, { error: error.message });
    console.error("Worker registration failed:", error.message);
    return respond(response, 503, { error: "Registration is temporarily unavailable. Please try again later." });
  }
};
