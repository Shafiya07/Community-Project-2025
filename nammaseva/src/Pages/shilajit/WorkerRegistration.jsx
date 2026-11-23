import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../Components/shilajit/Navbar";
import TurnstileField from "../../Components/shilajit/TurnstileField";
import { createWorker, isValidIndianMobile, normalizeMobile } from "../../api/workers";
import { turnstileSiteKey } from "../../config/turnstile";
import { categories } from "../../i18n/translations";
import { useLanguage } from "../../i18n/LanguageContext";
import "./Directory.css";

const initialForm = {
  name: "",
  phone: "",
  profession: "",
  skills: "",
  experience: "",
  serviceAreas: "",
  description: "",
  languages: "",
  workingHours: "",
  consultationFee: "",
  publishedContact: false,
};

function splitValues(value) {
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

export default function WorkerRegistration() {
  const { language, t } = useLanguage();
  const registrationUnavailable = import.meta.env.PROD && !turnstileSiteKey;
  const [form, setForm] = useState(initialForm);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [requestFailed, setRequestFailed] = useState(false);
  const [requestError, setRequestError] = useState("");

  useEffect(() => {
    if (!photo) {
      setPhotoPreview("");
      return undefined;
    }
    const preview = URL.createObjectURL(photo);
    setPhotoPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [photo]);

  function update(event) {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setSuccess(false);
    setRequestFailed(false);
    setRequestError("");
  }

  function updatePhoto(event) {
    const selected = event.target.files?.[0] || null;
    setPhoto(selected);
    setErrors((current) => ({ ...current, photo: "" }));
    setSuccess(false);
    setRequestFailed(false);
    setRequestError("");
  }

  function validate() {
    const nextErrors = {};
    ["name", "phone", "profession", "experience", "serviceAreas", "description", "languages"].forEach((field) => {
      if (!String(form[field]).trim()) nextErrors[field] = t("required");
    });
    if (form.phone && !isValidIndianMobile(form.phone)) nextErrors.phone = t("invalidPhone");
    if (form.experience && (!Number.isFinite(Number(form.experience)) || Number(form.experience) < 0)) {
      nextErrors.experience = t("invalidExperience");
    }
    if (photo && (!["image/jpeg", "image/png", "image/webp"].includes(photo.type) || photo.size > 2 * 1024 * 1024)) {
      nextErrors.photo = photo.size > 2 * 1024 * 1024 ? t("photoTooLarge") : t("invalidPhoto");
    }
    if (!form.publishedContact) nextErrors.publishedContact = t("consentRequired");
    if (import.meta.env.PROD && !turnstileToken) nextErrors.turnstile = t("turnstileRequired");
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    setSuccess(false);
    setRequestFailed(false);
    setRequestError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      await createWorker({
        name: form.name.trim(),
        phone: normalizeMobile(form.phone),
        profession: form.profession,
        skills: splitValues(form.skills),
        experience: Number(form.experience),
        serviceAreas: splitValues(form.serviceAreas),
        description: form.description.trim(),
        languages: splitValues(form.languages),
        workingHours: form.workingHours.trim(),
        consultationFee: form.consultationFee === "" ? null : Number(form.consultationFee),
        publishedContact: true,
      }, photo, turnstileToken);
      setForm(initialForm);
      setPhoto(null);
      setTurnstileToken("");
      setTurnstileResetKey((current) => current + 1);
      setSuccess(true);
    } catch (error) {
      setRequestFailed(true);
      setRequestError(error.message || t("registrationError"));
    } finally {
      setSubmitting(false);
    }
  }

  function fieldError(name) {
    return errors[name] ? <span className="field-error" role="alert">{errors[name]}</span> : null;
  }

  return (
    <>
      <Navbar />
      <main className="page-shell form-shell">
        <section className="page-heading">
          <p className="eyebrow">{t("locationLine")}</p>
          <h1>{t("registerTitle")}</h1>
          <p>{t("registerCopy")}</p>
        </section>
        <form className="registration-form" onSubmit={submit} noValidate>
          <p className="account-hint">Worker registration is linked to your account. <Link to="/my-profile">Sign in or create your worker account</Link> first.</p>
          <div className="form-grid">
            <label className="field-label">
              {t("fullName")} *
              <input name="name" value={form.name} onChange={update} autoComplete="name" required />
              {fieldError("name")}
            </label>
            <label className="field-label">
              {t("mobile")} *
              <input name="phone" value={form.phone} onChange={update} inputMode="tel" autoComplete="tel-national" maxLength={15} required />
              {fieldError("phone")}
            </label>
            <label className="field-label">
              {t("profession")} *
              <select name="profession" value={form.profession} onChange={update} required>
                <option value="">{t("chooseProfession")}</option>
                {categories.map((category) => (
                  <option key={category.id} value={language === "kn" ? category.kn : category.en}>
                    {language === "kn" ? category.kn : category.en}
                  </option>
                ))}
              </select>
              {fieldError("profession")}
            </label>
            <label className="field-label">
              {t("experienceYears")} *
              <input name="experience" type="number" min="0" max="80" step="1" value={form.experience} onChange={update} required />
              {fieldError("experience")}
            </label>
            <label className="field-label">
              {t("additionalSkills")}
              <input name="skills" value={form.skills} onChange={update} />
            </label>
            <label className="field-label">
              {t("serviceAreasInput")} *
              <input name="serviceAreas" value={form.serviceAreas} onChange={update} placeholder={t("localityPlaceholder")} required />
              {fieldError("serviceAreas")}
            </label>
            <label className="field-label">
              {t("spokenLanguages")} *
              <input name="languages" value={form.languages} onChange={update} placeholder={t("spokenLanguagesPlaceholder")} required />
              {fieldError("languages")}
            </label>
            <label className="field-label">
              {t("workingHoursInput")}
              <input name="workingHours" value={form.workingHours} onChange={update} />
            </label>
            <label className="field-label">
              {t("visitFeeInput")}
              <input name="consultationFee" type="number" min="0" max="500000" step="0.01" value={form.consultationFee} onChange={update} />
              <small className="field-help">{t("visitFeeHelp")}</small>
            </label>
            <label className="field-label form-span">
              {t("description")} *
              <textarea name="description" rows="4" maxLength="500" value={form.description} onChange={update} required />
              {fieldError("description")}
            </label>
            <label className="field-label form-span">
              {t("photo")}
              <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={updatePhoto} />
              {photoPreview && <img className="registration-photo-preview" src={photoPreview} alt={t("photoPreview")} />}
              {fieldError("photo")}
            </label>
          </div>
          <label className="checkbox-label consent-label">
            <input name="publishedContact" type="checkbox" checked={form.publishedContact} onChange={update} />
            <span>{t("publishConsent")}</span>
          </label>
          {fieldError("publishedContact")}
          {import.meta.env.PROD && (
            <div className="registration-antispam">
              <TurnstileField
                resetKey={turnstileResetKey}
                onVerify={setTurnstileToken}
                label={t("registrationSetupRequired")}
              />
              {fieldError("turnstile")}
            </div>
          )}
          {success && (
            <p className="form-message success-notice" role="status">
              {t("registrationSuccess")} <Link to="/my-profile">View your profile</Link>
            </p>
          )}
          {requestFailed && <p className="form-message error-notice" role="alert">{requestError || t("registrationError")}</p>}
          <button
            className="button button-primary registration-submit"
            type="submit"
            disabled={submitting || registrationUnavailable}
            aria-describedby={registrationUnavailable ? "registration-setup-warning" : undefined}
          >
            {submitting ? t("submitting") : t("submitRegistration")}
          </button>
        </form>
        <p className="form-footnote">{t("aboutNote")}</p>
        <Link className="text-link" to="/workers">{t("findWorkers")} →</Link>
      </main>
    </>
  );
}
