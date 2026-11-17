import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext";
import "../../Pages/shilajit/Directory.css";

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    { to: "/", label: t("home") },
    { to: "/workers", label: t("findWorkers") },
    { to: "/#categories", label: t("categories") },
    { to: "/register", label: t("registerWorker") },
    { to: "/about", label: t("about") },
  ];

  return (
    <header className="site-header">
      <div className="site-nav">
        <Link className="brand" to="/" aria-label="Namma Seva home" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark" aria-hidden="true">⌂</span>
          <span><strong>Namma Seva</strong><small>ನಮ್ಮ ಸೇವೆ</small></span>
        </Link>
        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? "×" : "☰"}
        </button>
        <nav className={`nav-links${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => isActive && link.to !== "/#categories" ? "active" : ""}
            >
              {link.label}
            </NavLink>
          ))}
          <button
            type="button"
            className="language-toggle"
            onClick={() => setLanguage(language === "en" ? "kn" : "en")}
            aria-label={`Switch language to ${t("language")}`}
          >
            {t("language")}
          </button>
        </nav>
      </div>
    </header>
  );
}
