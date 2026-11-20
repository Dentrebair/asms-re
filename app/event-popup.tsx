"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Dialog } from "@astryxdesign/core/Dialog";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Layout";
import { EVENT, eventPhase, trackEvent } from "@/lib/event";
import EventForm from "./event-offer/event-form";

const DISMISSED = `asms-event-${EVENT.slug}-dismissed`;
const REGISTERED = `asms-event-${EVENT.slug}`;
const read = (store: "local" | "session", key: string) => {
  try { return (store === "local" ? localStorage : sessionStorage).getItem(key); } catch { return null; }
};

/** The event offer, opened once per visit on the public pages until the offer closes. */
export default function EventPopup() {
  const path = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  // Rendered only once it is going to open, so pages never carry a hidden second form.
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (eventPhase() === "closed" || path.startsWith(EVENT.path)) return;
    if (read("session", DISMISSED) || read("local", REGISTERED)) return;
    const id = setTimeout(() => { setShown(true); setOpen(true); trackEvent("view"); }, 900);
    return () => clearTimeout(id);
  }, [path]);

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) { try { sessionStorage.setItem(DISMISSED, "1"); } catch { /* shows again next page */ } }
  };

  if (!shown) return null;
  return (
    <Dialog isOpen={open} onOpenChange={close} width={440} maxHeight="92dvh" purpose="form" aria-labelledby="event-popup-title">
      <DialogHeader title={<span id="event-popup-title">Exclusive event offer</span>} subtitle="ASMS‑ROUNAQH · 21 November 2026" onOpenChange={close} />
      <VStack gap={4}>
        <div className="event-offer-badge">
          <p className="event-offer-big">25% OFF</p>
          <p className="event-offer-what">our real estate brokerage commission</p>
        </div>
        <Text as="p">Register by 21 November, 11:59 PM IST, to claim this benefit on an eligible property transaction.</Text>
        <EventForm source="popup" />
        <Text type="supporting" as="p"><Link href={EVENT.path} onClick={() => close(false)}>See the full offer</Link></Text>
      </VStack>
    </Dialog>
  );
}
