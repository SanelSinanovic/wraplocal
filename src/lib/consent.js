const CONSENT_KEY = "wb_cookie_consent";
const ALLOW_VALUE = "allow_optional";
const DENY_VALUE = "deny_optional";
const OPEN_EVENT = "wb:open-cookie-preferences";

export function getCookieConsent() {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === ALLOW_VALUE || value === DENY_VALUE ? value : null;
  } catch {
    return null;
  }
}

export function setCookieConsent(allowed) {
  try {
    localStorage.setItem(CONSENT_KEY, allowed ? ALLOW_VALUE : DENY_VALUE);
  } catch {
    // Essential app behavior should not fail if storage is unavailable.
  }
}

export function hasOptionalCookieConsent() {
  return getCookieConsent() === ALLOW_VALUE;
}

export function openCookiePreferences() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onCookiePreferencesOpen(callback) {
  window.addEventListener(OPEN_EVENT, callback);
  return () => window.removeEventListener(OPEN_EVENT, callback);
}
