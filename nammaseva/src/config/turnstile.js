const configuredSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

// The site key is public by design. Keep the production widget available if a
// deployment omits the Vercel build variable; the server secret stays private.
export const turnstileSiteKey = configuredSiteKey || (
  import.meta.env.PROD ? "0x4AAAAAAGJCFd32ICmA48t4" : ""
);
