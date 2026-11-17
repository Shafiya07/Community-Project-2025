import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../../Components/shilajit/Navbar";
import { useLanguage } from "../../i18n/LanguageContext";
import "./Directory.css";

export default function About() {
  const { t } = useLanguage();
  return (
    <>
      <Navbar />
      <main className="page-shell about-shell">
        <p className="eyebrow">{t("locationLine")}</p>
        <h1>{t("aboutTitle")}</h1>
        <p className="about-copy">{t("aboutCopy")}</p>
        <div className="notice"><strong>{t("aboutNote")}</strong></div>
        <div className="about-actions">
          <Link className="button button-primary" to="/workers">{t("findWorkers")}</Link>
          <Link className="button button-secondary" to="/register">{t("registerWorker")}</Link>
        </div>
      </main>
    </>
  );
}
