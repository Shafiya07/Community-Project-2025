import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../../Components/shilajit/Navbar";
import { averageRating, getReviews, getWorkers } from "../../api/workers";
import { categories } from "../../i18n/translations";
import { useLanguage } from "../../i18n/LanguageContext";
import { demoWorkers } from "../../data/demoWorkers";
import LocationSearch from "../../Components/shilajit/LocationSearch";
import WorkerCard from "./WorkerCard";
import "./Directory.css";

function asList(value) {
  return Array.isArray(value) ? value : typeof value === "string" && value ? [value] : [];
}

export default function Directory() {
  const { language, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [workers, setWorkers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [usingDemoWorkers, setUsingDemoWorkers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [keyword, setKeyword] = useState(searchParams.get("q") || searchParams.get("service") || "");
  const [locality, setLocality] = useState(searchParams.get("locality") || "");
  const [locationArea, setLocationArea] = useState(searchParams.get("area") || "");
  const [minimumExperience, setMinimumExperience] = useState(searchParams.get("experience") || "");
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get("verified") === "true");
  const [sort, setSort] = useState(searchParams.get("sort") || "fee");
  const [maxVisitFee, setMaxVisitFee] = useState("");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [activeCategory, setActiveCategory] = useState(searchParams.get("category") || "");
  const [viewMode, setViewMode] = useState("list");

  useEffect(() => {
    setKeyword(searchParams.get("q") || searchParams.get("service") || "");
    setLocality(searchParams.get("locality") || "");
    setLocationArea(searchParams.get("area") || "");
    setActiveCategory(searchParams.get("category") || "");
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    Promise.all([getWorkers(), getReviews()])
      .then(([allWorkers, allReviews]) => {
        if (!mounted) return;
        const approvedWorkers = allWorkers.filter((worker) => worker.status === "approved");
        const showDemoWorkers = approvedWorkers.length === 0;
        setWorkers(showDemoWorkers ? demoWorkers : approvedWorkers);
        setUsingDemoWorkers(showDemoWorkers);
        setReviews(allReviews);
      })
      .catch((error) => {
        if (!mounted) return;
        if (error?.message?.startsWith("Supabase is not configured.")) {
          setWorkers(demoWorkers);
          setUsingDemoWorkers(true);
          return;
        }
        setLoadError(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const categoryCounts = useMemo(() => {
    const counts = new Map();
    categories.forEach((category) => {
      const terms = category.terms.map((term) => term.toLocaleLowerCase());
      counts.set(category.id, workers.filter((worker) => {
        const text = [
          worker.profession,
          ...asList(worker.skills),
        ].filter(Boolean).join(" ").toLocaleLowerCase();
        return terms.some((term) => text.includes(term));
      }).length);
    });
    return counts;
  }, [workers]);

  const filteredWorkers = useMemo(() => {
    const query = keyword.trim().toLocaleLowerCase();
    const category = categories.find((item) =>
      item.id === query ||
      item.en.toLocaleLowerCase() === query ||
      item.kn.toLocaleLowerCase() === query ||
      item.terms.some((term) => term.toLocaleLowerCase() === query)
    );
    const terms = category ? category.terms.map((term) => term.toLocaleLowerCase()) : [];
    const selectedCategory = categories.find((item) => item.id === activeCategory);
    const selectedTerms = selectedCategory?.terms.map((term) => term.toLocaleLowerCase()) || [];
    const areaQuery = (locationArea || locality).trim();
    const isCitySearch = /^(tumakuru|tumkur|ತುಮಕೂರು)(,\s*karnataka)?$/i.test(areaQuery);
    const filtered = workers.filter((worker) => {
      const text = [
        worker.name, worker.fullName, worker.profession,
        ...asList(worker.skills), ...asList(worker.serviceAreas),
      ].filter(Boolean).join(" ").toLocaleLowerCase();
      const matchesKeyword = !query || text.includes(query) || terms.some((term) => text.includes(term));
      const matchesCategory = !activeCategory || selectedTerms.some((term) => text.includes(term));
      const localityTerms = [areaQuery, locality].filter(Boolean).map((term) => term.toLocaleLowerCase());
      const matchesLocality = !areaQuery || isCitySearch || asList(worker.serviceAreas).some((serviceArea) => {
        const normalizedArea = serviceArea.toLocaleLowerCase();
        return localityTerms.some((term) => normalizedArea.includes(term) || term.includes(normalizedArea));
      });
      const matchesExperience = !minimumExperience || Number(worker.experience) >= Number(minimumExperience);
      const matchesVerified = !verifiedOnly || worker.verified === true;
      const matchesAvailability = !availableOnly || worker.availabilityStatus === "available" || worker.isDemo;
      const fee = worker.consultationFee == null ? null : Number(worker.consultationFee);
      const matchesVisitFee = !maxVisitFee || (fee !== null && Number.isFinite(fee) && fee <= Number(maxVisitFee));
      return matchesKeyword && matchesCategory && matchesLocality && matchesExperience && matchesVerified && matchesAvailability && matchesVisitFee;
    });

    if (sort === "fee") {
      return filtered.sort((a, b) => {
        const feeA = a.consultationFee == null ? Number.POSITIVE_INFINITY : Number(a.consultationFee);
        const feeB = b.consultationFee == null ? Number.POSITIVE_INFINITY : Number(b.consultationFee);
        return feeA - feeB;
      });
    }
    if (sort === "rating") {
      return filtered.sort((a, b) => {
        const ratingA = averageRating(reviews, a.id);
        const ratingB = averageRating(reviews, b.id);
        return (ratingB?.average || -1) - (ratingA?.average || -1);
      });
    }
    return filtered;
  }, [keyword, locality, locationArea, minimumExperience, verifiedOnly, sort, activeCategory, workers, reviews, maxVisitFee, availableOnly]);

  function clearFilters() {
    setKeyword("");
    setLocality("");
    setLocationArea("");
    setMinimumExperience("");
    setVerifiedOnly(false);
    setSort("fee");
    setMaxVisitFee("");
    setAvailableOnly(true);
    setActiveCategory("");
    setSearchParams({});
  }

  function updateKeyword(value) {
    setKeyword(value);
    setActiveCategory("");
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("service");
      next.delete("category");
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");
      return next;
    });
  }

  function updateCategory(categoryId) {
    const nextCategory = activeCategory === categoryId ? "" : categoryId;
    setActiveCategory(nextCategory);
    if (categoryId) setKeyword("");
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (categoryId) {
        next.delete("q");
        next.delete("service");
      }
      if (nextCategory) next.set("category", nextCategory);
      else next.delete("category");
      return next;
    });
  }

  function selectLocation(value, place) {
    setLocality(value);
    setLocationArea(place?.area || "");
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set("locality", value);
      else next.delete("locality");
      if (place) {
        next.set("area", place.area);
        next.set("lat", String(place.latitude));
        next.set("lon", String(place.longitude));
      } else {
        next.delete("area");
        next.delete("lat");
        next.delete("lon");
      }
      return next;
    });
  }

  const latitude = Number(searchParams.get("lat"));
  const longitude = Number(searchParams.get("lon"));
  const hasMapLocation = Number.isFinite(latitude) && Number.isFinite(longitude) && searchParams.has("lat") && searchParams.has("lon");
  const mapUrl = hasMapLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.025}%2C${latitude - 0.018}%2C${longitude + 0.025}%2C${latitude + 0.018}&layer=mapnik&marker=${latitude}%2C${longitude}`
    : "https://www.openstreetmap.org/export/embed.html?bbox=77.06%2C13.28%2C77.18%2C13.39&layer=mapnik&marker=13.34%2C77.10";

  return (
    <>
      <Navbar />
      <main className="page-shell">
        <section className="page-heading">
          <p className="eyebrow">{t("locationLine")}</p>
          <h1>{t("directoryTitle")}</h1>
          <p>{t("directoryCopy")}</p>
        </section>
        <form className="directory-search" onSubmit={(event) => event.preventDefault()}>
          <label className="directory-search-field">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label={t("keyword")}
              value={keyword}
              onChange={(event) => updateKeyword(event.target.value)}
              placeholder={t("servicePlaceholder")}
            />
          </label>
          <label className="directory-search-field directory-location-field">
            <span aria-hidden="true">⌖</span>
            <LocationSearch
              ariaLabel={t("locality")}
              value={locality}
              onChange={selectLocation}
              placeholder="Search address, area or pincode"
            />
          </label>
          <button type="submit" className="button button-primary">{t("findButton")}</button>
        </form>

        <nav className="directory-categories" aria-label={t("categories")}>
          <button
            type="button"
            className={`category-filter${activeCategory ? "" : " is-active"}`}
            aria-pressed={!activeCategory}
            onClick={() => updateCategory("")}
          >
            {t("allServices")} <span>{workers.length}</span>
          </button>
          {categories.map((category) => (
            <button
              type="button"
              key={category.id}
              className={`category-filter${activeCategory === category.id ? " is-active" : ""}`}
              aria-pressed={activeCategory === category.id}
              onClick={() => updateCategory(category.id)}
            >
              <span aria-hidden="true">{category.icon}</span>
              {language === "kn" ? category.kn : category.en}
              <span>{categoryCounts.get(category.id) || 0}</span>
            </button>
          ))}
        </nav>

        <div className="directory-layout">
          <aside className="filters-panel" aria-label={t("findWorkers")}>
            <label className="field-label directory-advanced-locality">
              {t("locality")}
              <LocationSearch
                value={locality}
                onChange={selectLocation}
                ariaLabel={t("locality")}
                placeholder="Search address, area or pincode"
              />
            </label>
            <label className="field-label">
              {t("maxVisitFee")}
              <input type="number" min="0" max="500000" step="0.01" value={maxVisitFee} onChange={(event) => setMaxVisitFee(event.target.value)} placeholder="Any fee" />
              <small className="field-help">{t("visitFeeFilterHelp")}</small>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} />
              {t("availableOnly")}
            </label>
            <label className="field-label">
              {t("experience")}
              <select value={minimumExperience} onChange={(event) => setMinimumExperience(event.target.value)}>
                <option value="">{t("anyExperience")}</option>
                <option value="1">1+</option>
                <option value="3">3+</option>
                <option value="5">5+</option>
                <option value="10">10+</option>
              </select>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} />
              {t("verifiedOnly")}
            </label>
            <label className="field-label">
              {t("sortResults")}
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="">{t("anySort")}</option>
                <option value="fee">{t("sortFee")}</option>
                <option value="rating">{t("sortRating")}</option>
              </select>
            </label>
            <button type="button" className="button button-quiet" onClick={clearFilters}>{t("clearFilters")}</button>
          </aside>
          <section className="directory-results" aria-live="polite">
            <div className="directory-results-toolbar">
              {!loading && !loadError && <p className="result-count">{filteredWorkers.length} {t("resultCount")}</p>}
              <div className="directory-view-toggle" role="group" aria-label={t("directoryView")}>
                <button type="button" className={viewMode === "list" ? "is-active" : ""} aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")}>{t("listView")}</button>
                <button type="button" className={viewMode === "map" ? "is-active" : ""} aria-pressed={viewMode === "map"} onClick={() => setViewMode("map")}>{t("mapView")}</button>
              </div>
            </div>
            {!loading && !loadError && usingDemoWorkers && (
              <p className="notice demo-notice" role="status">{t("demoDirectoryNotice")}</p>
            )}
            {viewMode === "map" && (
              <div className="directory-map">
                <iframe title={t("tumakuruMap")} src={mapUrl} loading="lazy" />
                <p>{t("mapLocationNote")}</p>
              </div>
            )}
            {loading ? <p className="notice">{t("loading")}</p> : loadError ? (
              <div className="empty-state"><h2>{t("loadError")}</h2><Link to="/register" className="text-link">{t("registerWorker")} →</Link></div>
            ) : filteredWorkers.length ? (
              <div className="worker-grid">
                {filteredWorkers.map((worker) => (
                  <WorkerCard key={worker.id} worker={worker} rating={averageRating(reviews, worker.id)} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon" aria-hidden="true">⌕</span>
                <h2>{workers.length ? t("noResultsTitle") : t("noWorkersTitle")}</h2>
                <p>{workers.length ? t("noResultsCopy") : t("noWorkersCopy")}</p>
                <button type="button" className="button button-secondary" onClick={clearFilters}>{t("clearFilters")}</button>
                <Link className="text-link" to="/register">{t("registerWorker")} →</Link>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
