import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../../Components/shilajit/Navbar";
import { useLanguage } from "../../i18n/LanguageContext";
import "./Directory.css";

const pageContent = {
  contact: ["contactTitle", "contactCopy", "findWorkers"],
  privacy: ["privacyTitle", "privacyCopy", "registerWorker"],
  terms: ["termsTitle", "termsCopy", "findWorkers"],
};

export default function InfoPage({ page }) {
  const { t } = useLanguage();
  const [title, copy, action] = pageContent[page];

  return (
    <>
      <Navbar />
      <main className="page-shell about-shell">
        <p className="eyebrow">{t("locationLine")}</p>
        <h1>{t(title)}</h1>
        <p className="about-copy">{t(copy)}</p>
        <Link className="button button-primary" to={page === "contact" ? "/workers" : "/register"}>{t(action)}</Link>
      </main>
    </>
  );
}
