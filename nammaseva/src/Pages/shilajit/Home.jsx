import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { categories } from "../../i18n/translations";
import { useLanguage } from "../../i18n/LanguageContext";
import acRepair from "../Rabi/images/acrepair.jpg";
import carpenter from "../Rabi/images/carpenter.jpg";
import electronics from "../Rabi/images/electronics.jpg";
import fullHomeCleaning from "../Rabi/images/fullhomecleaning.jpg";
import furnitureMaking from "../Rabi/images/furnituremaking.jpg";
import geyser from "../Rabi/images/geyser.jpg";
import homePainting from "../Rabi/images/homepainting.jpg";
import plumber from "../Rabi/images/plumber.jpg";
import salonMen from "../Rabi/images/salonmen.jpg";
import beautyServiceImage from "./images/beauty-service.jpg";
import carWashingImage from "./images/car-washing.jpg";
import eventDecoratorImage from "./images/event-decorator.jpg";
import homeBakerImage from "./images/home-baker.jpg";
import homeCookImage from "./images/home-cook.jpg";
import makeupArtistImage from "./images/makeup-artist.jpg";
import mehendiArtistImage from "./images/mehendi-artist.jpg";
import mobileRepairImage from "./images/mobile-repair.jpg";
import petSitterImage from "./images/pet-sitter.jpg";
import photographerImage from "./images/photographer.jpg";
import rangoliArtistImage from "./images/rangoli-artist.jpg";
import tailoringServiceImage from "./images/tailoring-service.jpg";
import tuitionTeacherImage from "./images/tuition-teacher.jpg";
import yogaInstructorImage from "./images/yoga-instructor.jpg";
import "./Directory.css";
import "./Home.css";

const exploreServices = [
  { title: "AC Repair", meta: "Repair, service & installation", image: acRepair, icon: "❄" },
  { title: "Home Cleaning", meta: "Deep cleaning & housekeeping", image: fullHomeCleaning, icon: "✦" },
  { title: "Carpentry", meta: "Furniture repair & fitting", image: carpenter, icon: "⌁" },
  { title: "Home Painting", meta: "Interior & exterior painting", image: homePainting, icon: "▧" },
  { title: "Electrical", meta: "Electrician & wiring service", image: electronics, icon: "ϟ" },
  { title: "Plumbing", meta: "Plumbing & water repairs", image: plumber, icon: "⌇" },
  { title: "Salon for Men", meta: "Haircut & grooming at home", image: salonMen, icon: "✂" },
  { title: "Appliance Repair", meta: "Washing machine, geyser & more", image: geyser, icon: "⌂" },
];

const shortTermImages = {
  "mehendi-artist": mehendiArtistImage,
  "home-baker": homeBakerImage,
  photographer: photographerImage,
  "makeup-artist": makeupArtistImage,
  "tailoring-service": tailoringServiceImage,
  "tuition-teacher": tuitionTeacherImage,
  "rangoli-artist": rangoliArtistImage,
  "pet-sitter": petSitterImage,
  "car-washing": carWashingImage,
  "home-cook": homeCookImage,
  "event-decorator": eventDecoratorImage,
  "beauty-service": beautyServiceImage,
  "mobile-repair": mobileRepairImage,
  "yoga-instructor": yogaInstructorImage,
};

const shortTermJobs = categories
  .filter((category) => category.shortTerm)
  .map((category) => ({
    ...category,
    image: shortTermImages[category.id],
  }));

const popularSearches = [
  { label: "AC repair", service: "AC Repair" },
  { label: "Cleaning", service: "Home Cleaning" },
  { label: "Plumbing", service: "Plumbing" },
];

const professionalHighlights = [
  { icon: "✓", title: "Worker profiles", detail: "Explore profiles and service details shared by local providers." },
  { icon: "⌖", title: "Local to your area", detail: "Find independent professionals in Tumakuru." },
  { icon: "♡", title: "Direct contact", detail: "Talk to a worker and discuss your service." },
  { icon: "↗", title: "Grow your business", detail: "Register your skills and reach local customers." },
];

const popularServices = [
  { title: "Fan, switchboard & full wiring", detail: "Electrical repairs, fittings and wiring work for your home.", image: electronics },
  { title: "Leak repair, pipe fitting & fixtures", detail: "Get help with taps, pipes, washbasins and bathroom fittings.", image: plumber },
  { title: "AC deep service & gas charging", detail: "AC cleaning, inspection and repair by a local professional.", image: acRepair },
  { title: "Custom wood furniture & door fitting", detail: "Carpentry, furniture assembly and door installation.", image: furnitureMaking },
  { title: "Interior & exterior wall painting", detail: "Freshen up your home with painting and wall care.", image: homePainting },
];

const localHubs = [
  {
    title: "Appliance repair & maintenance",
    icon: "⌂",
    links: ["AC repair & service", "Refrigerator repair", "Washing machine repair", "Geyser installation"],
  },
  {
    title: "Home repairs & construction",
    icon: "⌁",
    links: ["Electrician & wiring", "Carpenter & furniture", "Plumbing & fittings", "Painting & waterproofing"],
  },
  {
    title: "Cleaning & home maintenance",
    icon: "✦",
    links: ["Full home cleaning", "Bathroom cleaning", "Sofa cleaning", "Pest control"],
  },
  {
    title: "Salon & personal care",
    icon: "✂",
    links: ["Salon for men", "Salon for women", "Massage & spa", "Hair, skin & nails"],
  },
];

const steps = [
  { title: "Tell us what you need", detail: "Choose a service and share your location in Tumakuru." },
  { title: "Find a local professional", detail: "Compare profiles and choose the right person for your job." },
  { title: "Talk through the work", detail: "Contact the professional directly to discuss the details." },
  { title: "Get the work done", detail: "Agree on a time and complete your service with confidence." },
];

const reasons = [
  { icon: "✓", title: "Worker profiles", detail: "Explore independent service providers and the work they offer." },
  { icon: "⌖", title: "Tumakuru-local focus", detail: "Discover independent service providers around your neighborhood." },
  { icon: "↔", title: "Direct communication", detail: "Discuss availability and service details directly with workers." },
  { icon: "ಕ", title: "Kannada & English", detail: "Explore local services in the language that feels comfortable." },
];

export default function Home() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [service, setService] = useState("");
  const [location, setLocation] = useState("Tumakuru");
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== "undefined" && window.innerWidth > 900);

  useEffect(() => {
    function syncSidebarToViewport() {
      setSidebarOpen(window.innerWidth > 900);
    }

    window.addEventListener("resize", syncSidebarToViewport);
    return () => window.removeEventListener("resize", syncSidebarToViewport);
  }, []);

  function handleSearch(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (service) params.set("service", service);
    if (location.trim()) params.set("locality", location.trim());
    navigate(`/workers?${params.toString()}`);
  }

  return (
    <div className="landing-home">
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Dismiss navigation overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        id="landing-sidebar"
        className={`landing-sidebar${sidebarOpen ? "" : " is-closed"}`}
        aria-label="Namma Seva navigation"
        aria-hidden={!sidebarOpen}
      >
        <div className="sidebar-brand-row">
          <Link to="/" className="sidebar-brand" aria-label="Namma Seva home">
            <span className="landing-brand-mark" aria-hidden="true">⌂</span>
            <span><strong>Namma Seva</strong><small>Local service guide</small></span>
          </Link>
          <button
            type="button"
            className="sidebar-close"
            aria-label="Close side menu"
            onClick={() => setSidebarOpen(false)}
          >×</button>
        </div>
        <p className="sidebar-section-label">MENU</p>
        <nav className="sidebar-links">
          <a className="is-active" href="#overview"><span aria-hidden="true">▦</span> Overview</a>
          <a href="#categories"><span aria-hidden="true">⌂</span> Home services</a>
          <a href="#short-term-services"><span aria-hidden="true">✦</span> Short-term work</a>
          <Link to="/workers"><span aria-hidden="true">⌕</span> Find a worker</Link>
          <Link to="/register"><span aria-hidden="true">＋</span> Register as a pro</Link>
          <Link to="/about"><span aria-hidden="true">ⓘ</span> About Namma Seva</Link>
        </nav>
        <div className="sidebar-promo">
          <span className="sidebar-promo-icon" aria-hidden="true">⌖</span>
          <strong>Made for Tumakuru</strong>
          <p>Find independent local providers in English or Kannada.</p>
          <Link to="/workers">Explore providers <span aria-hidden="true">→</span></Link>
        </div>
        <p className="sidebar-footnote">ನಮ್ಮ ಸೇವೆ · Local help, closer to home</p>
      </aside>

      <div className="landing-workspace">
        <header className="landing-header">
          <div className="landing-header-inner">
            <button
              type="button"
              className="sidebar-toggle"
              aria-label={sidebarOpen ? "Close navigation sidebar" : "Open navigation sidebar"}
              aria-controls="landing-sidebar"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen((open) => !open)}
            >
              <span aria-hidden="true">{sidebarOpen ? "‹" : "☰"}</span>
            </button>
            <Link to="/" className="landing-brand" aria-label="Namma Seva home">
              <span className="landing-brand-mark" aria-hidden="true">⌂</span>
              <span><strong>Namma Seva</strong><small>ನಮ್ಮ ಸೇವೆ</small></span>
            </Link>
            <form className="search-panel landing-search" onSubmit={handleSearch}>
              <label>
                <span>I need a service</span>
                <select value={service} onChange={(event) => setService(event.target.value)}>
                  <option value="">Select a service</option>
                  {exploreServices.map((item) => <option key={item.title} value={item.title}>{item.title}</option>)}
                </select>
              </label>
              <label>
                <span>Location</span>
                <input value={location} onChange={(event) => setLocation(event.target.value)} aria-label="Your location" />
              </label>
              <button type="submit" className="primary-button">Search services <span aria-hidden="true">→</span></button>
            </form>
            <nav className="landing-nav" aria-label="Main navigation">
              <Link to="/">Home</Link>
              <a href="#categories">All Services</a>
              <Link to="/about">About</Link>
              <Link to="/contact">Support</Link>
            </nav>
            <div className="landing-actions">
              <span className="land-city-button"><span aria-hidden="true">⌖</span> Tumakuru</span>
              <Link to="/workers" className="land-login-button">Find a pro</Link>
              <Link to="/register" className="land-pro-button">Register as a pro</Link>
            </div>
          </div>
        </header>

      <section className="hero-screen" id="overview">
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="eyebrow eyebrow-compact">WELCOME · TUMAKURU, KARNATAKA</p>
            <h1>Home services at your doorstep.</h1>
            <p className="kannada-hero">ನಿಮ್ಮ ಮನೆಗೆ ಬೇಕಾದ ನಂಬಿಕೆಯ ಸೇವೆಗಳು</p>
            <p className="hero-description">
              Discover independent local professionals for repairs, cleaning, beauty and everyday home services.
            </p>
            <div className="hero-quick-links">
              <span>Popular:</span>
              {popularSearches.map((item) => (
                <button
                  key={item.service}
                  type="button"
                  aria-pressed={service === item.service}
                  onClick={() => setService(item.service)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="hero-decoration" aria-hidden="true">
            <img src={fullHomeCleaning} alt="" />
            <div className="hero-photo-caption">
              <span className="hero-photo-mark">⌖</span>
              <span><strong>Local services</strong><small>Focused on Tumakuru</small></span>
            </div>
          </div>
        </div>
      </section>

      <section className="overview-stats" aria-label="Namma Seva at a glance">
        <article className="overview-stat">
          <span className="overview-stat-icon blue" aria-hidden="true">⌂</span>
          <div><p>Home services</p><strong>{String(exploreServices.length).padStart(2, "0")} categories</strong><small>Repairs, cleaning and more</small></div>
        </article>
        <article className="overview-stat">
          <span className="overview-stat-icon violet" aria-hidden="true">✦</span>
          <div><p>Flexible local work</p><strong>{String(shortTermJobs.length).padStart(2, "0")} services</strong><small>Part-time friendly options</small></div>
        </article>
        <article className="overview-stat">
          <span className="overview-stat-icon green" aria-hidden="true">⌖</span>
          <div><p>Service area</p><strong>Tumakuru</strong><small>Karnataka, India</small></div>
        </article>
        <article className="overview-stat">
          <span className="overview-stat-icon amber" aria-hidden="true">ಕ</span>
          <div><p>Languages</p><strong>Kannada + English</strong><small>Choose the language you prefer</small></div>
        </article>
      </section>

      <main className="landing-main">
        <section className="panel-block" id="categories">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Explore local services</p>
              <h2>Explore services <span>· ಸೇವೆಗಳು</span></h2>
              <p className="section-subtitle">Book trusted help for everyday needs around your home.</p>
            </div>
            <Link to="/workers" className="ghost-button">View all services <span aria-hidden="true">→</span></Link>
          </div>
          <div className="service-grid">
            {exploreServices.map((item) => (
              <Link className="service-card" to={`/workers?service=${encodeURIComponent(item.title)}&locality=Tumakuru`} key={item.title}>
                <div className="service-image"><img src={item.image} alt="" loading="lazy" /></div>
                <div className="service-copy">
                  <span className="service-icon" aria-hidden="true">{item.icon}</span>
                  <h3>{item.title}</h3>
                  <p>{item.meta}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="panel-block short-term-panel" id="short-term-services">
          <div className="panel-head">
            <div>
              <p className="eyebrow">{language === "kn" ? "ಪಾರ್ಟ್-ಟೈಮ್ ಮತ್ತು ಅಲ್ಪಾವಧಿ ಕೆಲಸ" : "Flexible local work"}</p>
              <h2>
                {language === "kn" ? "ಅಲ್ಪಾವಧಿ ಕೆಲಸಗಳು ಮತ್ತು ಸೇವೆಗಳು" : "Short-term jobs & services"}
                <span> · {language === "kn" ? "ತಾತ್ಕಾಲಿಕ ಕೆಲಸ" : "Part-time friendly"}</span>
              </h2>
              <p className="section-subtitle">
                {language === "kn"
                  ? "ತುಮಕೂರಿನಲ್ಲಿ ನಿಮ್ಮ ಕೌಶಲ್ಯಕ್ಕೆ ಹೊಂದುವ ತಾತ್ಕಾಲಿಕ ಕೆಲಸ ಅಥವಾ ಸೇವೆಯನ್ನು ಹುಡುಕಿ."
                  : "Find flexible gigs and local services that match your skills in Tumakuru."}
              </p>
            </div>
            <Link to="/workers" className="ghost-button">
              {language === "kn" ? "ಎಲ್ಲಾ ಕೆಲಸಗಾರರನ್ನು ನೋಡಿ" : "Browse all workers"} <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="short-term-grid">
            {shortTermJobs.map((job) => (
              <Link
                className="short-term-card"
                to={`/workers?service=${encodeURIComponent(job.en)}&locality=Tumakuru`}
                key={job.id}
              >
                <img
                  className="short-term-image"
                  src={job.image}
                  alt={`${job.en} service`}
                  loading="lazy"
                  decoding="async"
                />
                <div className="short-term-copy">
                  <h3>{language === "kn" ? job.kn : job.en}</h3>
                  <p>{language === "kn" ? job.descriptionKn : job.descriptionEn}</p>
                  <span className="short-term-link">{language === "kn" ? "ಕೆಲಸಗಾರರನ್ನು ಹುಡುಕಿ" : "Find a worker"} <span aria-hidden="true">→</span></span>
                </div>
              </Link>
            ))}
          </div>
          <p className="short-term-safety">
            {language === "kn"
              ? "ಸುರಕ್ಷತಾ ಸೂಚನೆ: ಮೊಬೈಲ್ ದುರಸ್ತಿ ಮತ್ತು ಯೋಗ ಸೇವೆಗಳಿಗೆ ಸೂಕ್ತ ತರಬೇತಿ/ಅರ್ಹತೆ ಅಗತ್ಯ. ಅನುಮತಿಸಲಾದ ಸೌಂದರ್ಯ ಸೇವೆಗಳನ್ನು ಮಾತ್ರ ನೀಡಿ."
              : "Safety note: Mobile repair and yoga require suitable training or qualifications. Beauty providers should offer permitted services only."}
          </p>
          <details className="short-term-photo-credits">
            <summary>{language === "kn" ? "ಚಿತ್ರ ಕೃತಜ್ಞತೆಗಳು" : "Photo credits"}</summary>
            <p>
              <a href="https://commons.wikimedia.org/wiki/File:Birdal_mehndi_design.png" target="_blank" rel="noreferrer">Mehendi photo by Subha899</a> (
              <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>, resized) ·{" "}
              <a href="https://commons.wikimedia.org/wiki/File:Hand_sewing_machine_-_Macedonian_tailoring_craft.jpg" target="_blank" rel="noreferrer">Tailoring photo by Orce Wiki</a> (
              <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>, resized) ·{" "}
              <a href="https://commons.wikimedia.org/wiki/File:Rangoli_-_Floor_art_(24199037218).jpg" target="_blank" rel="noreferrer">Rangoli photo by dksesh</a> (
              <a href="https://creativecommons.org/licenses/by-sa/2.0/" target="_blank" rel="noreferrer">CC BY-SA 2.0</a>, resized).
            </p>
          </details>
        </section>

        <section className="panel-block soft-panel">
          <div className="panel-head narrow-head">
            <div>
              <p className="eyebrow">Your neighborhood, your choice</p>
              <h2>Find the right local professional</h2>
              <p className="section-subtitle">Browse profiles and connect directly with independent service providers.</p>
            </div>
            <Link to="/workers" className="ghost-button">Browse professionals <span aria-hidden="true">→</span></Link>
          </div>
          <div className="professional-grid">
            {professionalHighlights.map((item) => (
              <article className="professional-card" key={item.title}>
                <span className="professional-mark" aria-hidden="true">{item.icon}</span>
                <div className="professional-info">
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                  <Link to={item.title === "Grow your business" ? "/register" : "/workers"}>
                    {item.title === "Grow your business" ? "Register now" : "Explore directory"} <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel-block">
          <div className="panel-head narrow-head">
            <div>
              <p className="eyebrow">Popular in your area</p>
              <h2>Popular services in Tumakuru <span>· ತುಮಕೂರು</span></h2>
              <p className="section-subtitle">Explore common home services and find someone for the job.</p>
            </div>
            <Link to="/workers" className="ghost-button">See all services <span aria-hidden="true">→</span></Link>
          </div>
          <div className="popular-grid">
            {popularServices.map((item) => (
              <article className="popular-card" key={item.title}>
                <div className="popular-image"><img src={item.image} alt="" loading="lazy" /></div>
                <div className="popular-copy">
                  <span className="popular-label">Tumakuru local service</span>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                  <Link to={`/workers?service=${encodeURIComponent(item.title)}&locality=Tumakuru`}>Explore workers <span aria-hidden="true">→</span></Link>
                </div>
              </article>
            ))}
            <aside className="popular-prompt">
              <span className="eyebrow">Need a helping hand?</span>
              <h3>Find a local pro for your next home project.</h3>
              <p>Search the directory and connect with independent workers in your area.</p>
              <Link to="/workers">Browse services <span aria-hidden="true">→</span></Link>
            </aside>
          </div>
        </section>

        <section className="panel-block">
          <div className="panel-head narrow-head">
            <div>
              <p className="eyebrow">Browse by category</p>
              <h2>Local service hubs <span>· ನಿಮ್ಮ ಸುತ್ತಮುತ್ತ</span></h2>
            </div>
            <Link to="/workers" className="ghost-button">Browse directory <span aria-hidden="true">→</span></Link>
          </div>
          <div className="hub-grid">
            {localHubs.map((hub) => (
              <article className="hub-card" key={hub.title}>
                <div className="hub-copy">
                  <h3><span aria-hidden="true">{hub.icon}</span>{hub.title}</h3>
                  <div className="hub-links">
                    {hub.links.map((item) => (
                      <Link key={item} to={`/workers?service=${encodeURIComponent(item)}&locality=Tumakuru`}>{item}<span aria-hidden="true">↗</span></Link>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel-block soft-panel steps-panel">
          <div className="panel-head centered-head">
            <div>
              <p className="eyebrow">Simple and local</p>
              <h2>How it works <span>· ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ</span></h2>
              <p className="section-subtitle">A simple way to find the help you need.</p>
            </div>
          </div>
          <div className="steps-grid">
            {steps.map((step, index) => (
              <article className="steps-card" key={step.title}>
                <div className="step-badge">{String(index + 1).padStart(2, "0")}</div>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel-block">
          <div className="panel-head centered-head">
            <div>
              <p className="eyebrow">The Namma Seva difference</p>
              <h2>Why choose Namma Seva? <span>· ನಮ್ಮ ಸೇವೆ</span></h2>
              <p className="section-subtitle">A local-first directory for discovering and contacting home service professionals.</p>
            </div>
          </div>
          <div className="reason-grid">
            {reasons.map((item) => (
              <article className="reason-card" key={item.title}>
                <span className="reason-icon" aria-hidden="true">{item.icon}</span>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
          <div className="service-note">
            <span aria-hidden="true">ⓘ</span>
            <p>Worker listings are independently managed. Confirm availability, scope and pricing with the professional before booking.</p>
          </div>
        </section>

        <section className="cta-panel">
          <div className="cta-copy">
            <p className="eyebrow">For local service professionals</p>
            <h2>Are you a skilled technician in Tumakuru?</h2>
            <p>Share your skills with local customers and help your independent business grow.</p>
            <Link to="/register" className="cta-register">Register as a worker <span aria-hidden="true">→</span></Link>
          </div>
          <div className="cta-boxes">
            <div className="cta-item"><span aria-hidden="true">⌖</span><div><strong>Reach local customers</strong><small>Be discoverable in Tumakuru</small></div></div>
            <div className="cta-item"><span aria-hidden="true">↗</span><div><strong>Build your profile</strong><small>Showcase your skills and services</small></div></div>
          </div>
        </section>
      </main>
      </div>
    </div>
  );
}
