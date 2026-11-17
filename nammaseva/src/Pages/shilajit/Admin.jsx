import React, { useEffect, useState } from "react";
import Navbar from "../../Components/shilajit/Navbar";
import { getPendingWorkers, updateWorkerStatus } from "../../api/workers";
import { getSupabase } from "../../api/supabase";
import { useLanguage } from "../../i18n/LanguageContext";
import "./Directory.css";
import "./Admin.css";

export default function Admin() {
  const { t } = useLanguage();
  const [session, setSession] = useState(null);
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [workers, setWorkers] = useState([]);
  const [pageError, setPageError] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyWorker, setBusyWorker] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let subscription;
    try {
      const supabase = getSupabase();
      supabase.auth.getSession().then(({ data, error }) => {
        if (!active) return;
        if (error) setPageError(error.message);
        setSession(data?.session || null);
        setLoading(false);
      }).catch((error) => {
        if (!active) return;
        setPageError(error.message);
        setLoading(false);
      });
      ({ data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
        setPageError("");
      }));
    } catch (error) {
      setPageError(error.message);
      setLoading(false);
    }

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setWorkers([]);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setPageError("");
    getPendingWorkers()
      .then((items) => {
        if (active) setWorkers(items);
      })
      .catch((error) => {
        if (active) setPageError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [session]);

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);
    setPageError("");
    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      setPassword("");
    } catch (error) {
      setPageError(error.message || t("adminLoginError"));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setPageError("");
    try {
      const { error } = await getSupabase().auth.signOut();
      if (error) throw error;
    } catch (error) {
      setPageError(error.message || t("adminSignOutError"));
    }
  }

  async function reviewWorker(worker, status) {
    setBusyWorker(worker.id);
    setPageError("");
    try {
      await updateWorkerStatus(worker.id, status);
      setWorkers((current) => current.filter((item) => item.id !== worker.id));
    } catch (error) {
      setPageError(error.message);
    } finally {
      setBusyWorker("");
    }
  }

  return (
    <>
      <Navbar />
      <main className="page-shell admin-shell">
        <section className="page-heading">
          <p className="eyebrow">{t("locationLine")}</p>
          <h1>{t("adminTitle")}</h1>
          <p>{t("adminCopy")}</p>
        </section>

        {pageError && <p className="form-message error-notice" role="alert">{pageError}</p>}

        {!session ? (
          <form className="admin-login registration-form" onSubmit={signIn}>
            <h2>{t("adminLoginTitle")}</h2>
            <label className="field-label">
              {t("adminEmail")}
              <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="field-label">
              {t("adminPassword")}
              <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            <button type="submit" className="button button-primary" disabled={busy || loading}>
              {busy ? t("submitting") : t("adminLogin")}
            </button>
          </form>
        ) : (
          <section className="admin-queue">
            <div className="admin-queue-heading">
              <h2>{t("pendingApplications")}</h2>
              <button type="button" className="button button-quiet" onClick={signOut}>{t("adminSignOut")}</button>
            </div>
            {loading ? <p className="notice">{t("loading")}</p> : pageError ? null : workers.length ? (
              <div className="admin-worker-list">
                {workers.map((worker) => (
                  <article className="admin-worker-card" key={worker.id}>
                    <div className="admin-worker-photo">
                      {worker.photo ? <img src={worker.photo} alt="" /> : <span aria-hidden="true">{worker.name.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div className="admin-worker-info">
                      <p className="eyebrow">{worker.profession} · {worker.experience} {t("years")}</p>
                      <h3>{worker.name}</h3>
                      <p><strong>{t("mobile")}:</strong> {worker.phone}</p>
                      <p><strong>{t("serviceAreas")}:</strong> {worker.serviceAreas.join(", ")}</p>
                      <p><strong>{t("skills")}:</strong> {worker.skills.join(", ") || "—"}</p>
                      <p><strong>{t("languages")}:</strong> {worker.languages.join(", ")}</p>
                      <p className="admin-description">{worker.description}</p>
                      {worker.photo && <a href={worker.photo} target="_blank" rel="noreferrer">{t("viewPhoto")}</a>}
                      <div className="admin-worker-actions">
                        <button
                          type="button"
                          className="button button-primary"
                          onClick={() => reviewWorker(worker, "approved")}
                          disabled={busyWorker === worker.id}
                        >
                          {t("approveWorker")}
                        </button>
                        <button
                          type="button"
                          className="button button-quiet"
                          onClick={() => reviewWorker(worker, "rejected")}
                          disabled={busyWorker === worker.id}
                        >
                          {t("rejectWorker")}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : <div className="empty-state"><h2>{t("noPendingApplications")}</h2></div>}
          </section>
        )}
      </main>
    </>
  );
}
