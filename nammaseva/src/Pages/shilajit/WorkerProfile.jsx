import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../../Components/shilajit/Navbar";
import { averageRating, getReviews, getWorker, isValidIndianMobile, normalizeMobile } from "../../api/workers";
import { useLanguage } from "../../i18n/LanguageContext";
import { getDemoWorker } from "../../data/demoWorkers";
import { getWorkerCompletedBookingCount } from "../../api/bookings";
import "./Directory.css";

function displayList(value) {
  return Array.isArray(value) ? value.join(", ") : value || "";
}

export default function WorkerProfile() {
  const { id } = useParams();
  const { language, t } = useLanguage();
  const [worker, setWorker] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [completedBookings, setCompletedBookings] = useState(0);

  useEffect(() => {
    let mounted = true;
    const demoWorker = getDemoWorker(id);
    setWorker(null);
    setReviews([]);
    setNotFound(false);
    setCompletedBookings(0);
    if (demoWorker) {
      setWorker(demoWorker);
      return () => { mounted = false; };
    }

    Promise.all([getWorker(id), getReviews(), getWorkerCompletedBookingCount(id).catch(() => 0)])
      .then(([record, allReviews, completedCount]) => {
        if (!mounted) return;
        if (record.status !== "approved") {
          setNotFound(true);
          return;
        }
        setWorker(record);
        setReviews(allReviews);
        setCompletedBookings(completedCount);
      })
      .catch(() => {
        if (mounted) setNotFound(true);
      });
    return () => { mounted = false; };
  }, [id]);

  const rating = worker ? averageRating(reviews, worker.id) : null;
  const workerReviews = worker
    ? reviews.filter((review) => String(review.workerId) === String(worker.id) && review.status === "approved" && Number(review.rating) >= 1 && Number(review.rating) <= 5)
    : [];
  const publicPhone = worker?.publishedContact && isValidIndianMobile(worker.phone)
    ? normalizeMobile(worker.phone)
    : "";
  const whatsappUrl = publicPhone
    ? `https://wa.me/91${publicPhone}?${new URLSearchParams({ text: "Hello, I found your profile on Namma Seva. Are you available for your service in Tumakuru?" }).toString()}`
    : "";

  return (
    <>
      <Navbar />
      <main className="page-shell profile-shell">
        {notFound ? (
          <div className="empty-state"><h1>{t("notFound")}</h1><Link className="button button-secondary" to="/workers">{t("findWorkers")}</Link></div>
        ) : !worker ? (
          <p className="notice">{t("loading")}</p>
        ) : (
          <>
            <Link to="/workers" className="text-link">← {t("findWorkers")}</Link>
            <article className="profile-card">
              <div className="profile-top">
                <div className="worker-avatar profile-avatar" aria-hidden="true">
                  {worker.photo ? <img src={worker.photo} alt="" /> : (worker.name || worker.fullName || "").trim().charAt(0).toLocaleUpperCase()}
                </div>
                <div>
                  <p className="eyebrow">{t("profileTitle")}</p>
                  <h1>{worker.name || worker.fullName}</h1>
                  {worker.isDemo && <span className="demo-badge">{t("demoBadge")}</span>}
                  <p className="worker-profession">{worker.profession}</p>
                  {!worker.isDemo && <span className={`availability-badge availability-${worker.availabilityStatus}`} role="status">
                    <span aria-hidden="true" />
                    {worker.availabilityStatus === "busy" ? "Currently busy" : worker.availabilityStatus === "unavailable" ? "Unavailable right now" : "Available now"}
                  </span>}
                  {worker.verified === true && <span className="verified-badge">✓ {t("verified")}</span>}
                </div>
              </div>
              {worker.isDemo && (
                <p className="notice demo-profile-notice" role="status">{t("demoProfileNotice")}</p>
              )}
              <div className="profile-details">
                <section><h2>{t("experienceLabel")}</h2><p>{worker.experience} {Number(worker.experience) === 1 ? t("year") : t("years")}</p></section>
                <section><h2>Completed jobs</h2><p>{worker.isDemo ? "Sample profile" : completedBookings}</p></section>
                {displayList(worker.skills) && <section><h2>{t("skills")}</h2><p>{displayList(worker.skills)}</p></section>}
                {displayList(worker.serviceAreas) && <section><h2>{t("serviceAreas")}</h2><p>{displayList(worker.serviceAreas)}</p></section>}
                {displayList(worker.languages) && <section><h2>{t("languages")}</h2><p>{displayList(worker.languages)}</p></section>}
                {worker.description && <section><h2>{t("aboutWorker")}</h2><p>{worker.description}</p></section>}
                {worker.workingHours && <section><h2>{t("workingHours")}</h2><p>{worker.workingHours}</p></section>}
                {worker.pricing && <section><h2>{t("pricing")}</h2><p>{worker.pricing}</p></section>}
                <section>
                  <h2>{t("reviews")}</h2>
                  {rating ? <p className="worker-rating">★ {rating.average} · {rating.count} {t("reviews")}</p> : <p>{t("noReviews")}</p>}
                  {workerReviews.map((review) => (
                    <article className="review-item" key={review.id}>
                      <strong>{review.customerName || "Customer"}</strong>
                      <p className="worker-rating">★ {Number(review.rating)}</p>
                      {review.text && <p>{review.text}</p>}
                      {review.createdAt && <time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString(language === "kn" ? "kn-IN" : "en-IN")}</time>}
                    </article>
                  ))}
                  <p className="review-disclaimer">{t("aboutNote")}</p>
                </section>
              </div>
              {publicPhone && (
                <section className="profile-contact">
                  <h2>{t("contactWorker")}</h2>
                  <div className="contact-actions">
                    {!worker.isDemo && <Link className="button button-primary" to={`/book/${worker.id}`}>Book this worker</Link>}
                    <a className="button button-primary" href={`tel:+91${publicPhone}`}>{t("callWorker")}</a>
                    <a className="button button-secondary" href={whatsappUrl} target="_blank" rel="noreferrer">{t("whatsapp")}</a>
                  </div>
                </section>
              )}
            </article>
          </>
        )}
      </main>
    </>
  );
}
