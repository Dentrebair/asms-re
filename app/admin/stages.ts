import type { HistoryRow, PropertyStage } from "./lib";

export const STAGE_LABEL: Record<PropertyStage, string> = {
  draft: "Draft", submitted: "Submitted", under_review: "Under review", changes_requested: "Changes requested", rejected: "Rejected",
  approved: "Approved", live: "Live", paused: "Paused", sold: "Sold", expired: "Needs reconfirming", archived: "Archived",
};

export const stageTone = (stage: PropertyStage): "success" | "warning" | "error" | "neutral" | "info" =>
  stage === "live" ? "success" : stage === "rejected" ? "error" : stage === "changes_requested" ? "warning"
    : stage === "submitted" || stage === "under_review" ? "info" : stage === "draft" ? "warning" : "neutral";

/** What each stage means, in the seller's words (PRD section 11: submitted is not live). */
export const SELLER_STAGE_NOTE: Record<PropertyStage, string> = {
  draft: "Not sent yet. Finish the details and send it for review.",
  submitted: "Waiting for review. It is not on the website yet.",
  under_review: "Our team is checking the details and documents.",
  changes_requested: "Our reviewer asked for changes. Update the listing and send it again.",
  rejected: "This listing can’t be published. See the reviewer’s note.",
  approved: "Approved. It will appear on the website shortly.",
  live: "On the website and taking enquiries.",
  paused: "Hidden from buyers. Resume it at any time.",
  sold: "Marked sold. It has left search and takes no enquiries.",
  expired: "Hidden until the details are reconfirmed.",
  archived: "Archived.",
};

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export const formatDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : "—");
export const formatWhen = (iso: string) => timeFmt.format(new Date(iso));

/** One line for a history entry, e.g. "Sent for review" or "Changes requested". */
export function historyLine(h: Pick<HistoryRow, "action" | "detail">): string {
  if (h.action === "created") return "Listing started";
  if (h.action === "reconfirmed") return "Availability reconfirmed";
  if (h.action === "revision_submitted") return `Change request sent${h.detail?.fields?.length ? ` (${h.detail.fields.length} field${h.detail.fields.length === 1 ? "" : "s"})` : ""}`;
  if (h.action === "revision_approved") return "Change request applied";
  if (h.action === "revision_rejected") return "Change request declined";
  if (h.action === "seller_status") return h.detail?.to === "suspended" ? "Seller suspended" : "Seller reactivated";
  if (h.action === "stage" && h.detail?.to && h.detail.to in STAGE_LABEL) {
    const { from } = h.detail;
    const to = h.detail.to as PropertyStage;
    if (to === "submitted") return from === "changes_requested" ? "Sent for review again" : "Sent for review";
    if (to === "under_review") return "Review started";
    if (to === "live") return from === "paused" ? "Resumed" : from === "submitted" || from === "under_review" ? "Approved and published" : "Published";
    if (to === "draft" && from === "submitted") return "Withdrawn from review";
    return STAGE_LABEL[to];
  }
  return h.action;
}
