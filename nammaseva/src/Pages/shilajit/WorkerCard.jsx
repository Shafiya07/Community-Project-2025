import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext";

export default function WorkerCard({ worker, rating }) {
  const { t } = useLanguage();
  const areas = Array.isArray(worker.serviceAreas) ? worker.serviceAreas : [];
  const name = worker.name || worker.fullName || "";
  const profession = worker.profession || "";

  return (
    <article className="worker-card">
      <div className="worker-avatar" aria-hidden="true">
        {worker.photo ? <img src={worker.photo} alt="" /> : name.trim().charAt(0).toLocaleUpperCase()}
      </div>
      <div className="worker-card-content">
        <div className="worker-card-heading">
          <h3>{name}</h3>
          {worker.verified === true && <span className="verified-badge">✓ {t("verified")}</span>}
        </div>
        {worker.isDemo && <span className="demo-badge">{t("demoBadge")}</span>}
        <p className="worker-profession">{profession}</p>
        {!worker.isDemo && <span className={`availability-badge availability-${worker.availabilityStatus || "available"}`}><span aria-hidden="true" />{worker.availabilityStatus === "busy" ? "Currently busy" : worker.availabilityStatus === "unavailable" ? "Unavailable" : "Available now"}</span>}
        {worker.consultationFee != null && <p className="worker-meta worker-visit-fee">First visit / inspection: ₹{Number(worker.consultationFee).toLocaleString("en-IN")}</p>}
        <p className="worker-meta">{Number(worker.experience) || 0} {Number(worker.experience) === 1 ? t("year") : t("years")}</p>
        {areas.length > 0 && <p className="worker-meta">{areas.join(", ")}</p>}
        {rating ? (
          <p className="worker-rating" aria-label={`${rating.average} out of 5, ${rating.count} reviews`}>
            ★ {rating.average} · {rating.count} {t("reviews")}
          </p>
        ) : <p className="worker-meta">{t("noReviews")}</p>}
        <Link className="button button-secondary worker-card-action" to={`/workers/${worker.id}`}>{t("viewProfile")}</Link>
      </div>
    </article>
  );
}
