const SUPPORT_EMAIL = "support@wrapbridge.com";

export function buildDataDeletionRequestHref({ accountType, email, userId, businessName }) {
  const subject = encodeURIComponent(`Data Deletion Request - ${accountType || "WrapBridge Account"}`);
  const body = encodeURIComponent([
    "Hello WrapBridge support,",
    "",
    "I am requesting deletion of my personal data from WrapBridge.",
    "",
    `Account type: ${accountType || "Not specified"}`,
    `Email: ${email || "Not available"}`,
    `User ID: ${userId || "Not available"}`,
    businessName ? `Business name: ${businessName}` : null,
    "",
    "I understand some booking, payment, dispute, tax, accounting, fraud prevention, security, or legal records may need to be retained as required by law or platform policy.",
    "",
    "Thank you.",
  ].filter(Boolean).join("\n"));

  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}