import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext";
import "../../Pages/shilajit/Directory.css";

export default function Footer() {
  const { language, t } = useLanguage();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Link className="footer-brand" to="/">Namma Seva <span>ನಮ್ಮ ಸೇವೆ</span></Link>
        <p>{language === "kn" ? t("kannadaTagline") : t("tagline")}</p>
        <nav aria-label="Footer navigation">
          <Link to="/about">{t("footerAbout")}</Link>
          <Link to="/workers">{t("footerDirectory")}</Link>
          <Link to="/register">{t("footerRegister")}</Link>
          <Link to="/contact">{t("footerContact")}</Link>
          <Link to="/privacy">{t("privacyPolicy")}</Link>
          <Link to="/terms">{t("terms")}</Link>
        </nav>
        <small>{t("locationLine")}</small>
        <small>© {new Date().getFullYear()} Namma Seva</small>
      </div>
    </footer>
  );
}
