// Field checks shared by the public forms. Astryx inputs are controlled, so the
// browser's own constraint validation is not used; these give the same rules and
// return a message per field for each input's `status`.
export type FieldErrors = Record<string, string | undefined>;

const PHONE = /^[0-9+() -]{7,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function checkContact(f: { name: string; phone: string; email?: string; message?: string; consent?: boolean; messageRequired?: boolean; extra?: FieldErrors }): FieldErrors {
  const e: FieldErrors = {};
  if (!f.name.trim()) e.name = "Please enter your name.";
  else if (f.name.length > 120) e.name = "Please shorten your name to 120 characters.";
  if (!f.phone.trim()) e.phone = "Please enter a phone number.";
  else if (!PHONE.test(f.phone.trim())) e.phone = "Please enter a phone number using digits, spaces, + or brackets.";
  if (f.email?.trim() && !EMAIL.test(f.email.trim())) e.email = "Please enter a valid email address, or leave it empty.";
  Object.assign(e, f.extra);
  if (f.messageRequired && !f.message?.trim()) e.message = "Please tell us what you would like to know.";
  if (f.consent === false) e.consent = "Please agree so the team can contact you.";
  return Object.fromEntries(Object.entries(e).filter(([, v]) => v));
}
