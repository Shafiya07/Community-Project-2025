import React, { useEffect, useRef } from "react";

const SCRIPT_ID = "cloudflare-turnstile-script";

export default function TurnstileField({ resetKey, onVerify, label }) {
  const containerRef = useRef(null);
  const onVerifyRef = useRef(onVerify);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return undefined;
    let widgetId;
    let cancelled = false;
    const renderWidget = () => {
      if (cancelled || !window.turnstile || !containerRef.current || widgetId) return;
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action: "worker_registration",
        callback: (token) => onVerifyRef.current(token),
        "expired-callback": () => onVerifyRef.current(""),
        "error-callback": () => onVerifyRef.current(""),
      });
    };

    let script = document.getElementById(SCRIPT_ID);
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", renderWidget);
      document.head.appendChild(script);
    } else {
      script.addEventListener("load", renderWidget);
      renderWidget();
    }

    return () => {
      cancelled = true;
      script.removeEventListener("load", renderWidget);
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [resetKey, siteKey]);

  if (!siteKey) {
    return <p className="turnstile-unavailable" id="registration-setup-warning" role="alert">{label}</p>;
  }
  return <div ref={containerRef} className="turnstile-field" aria-label={label} />;
}
