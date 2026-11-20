"use client";

import { useEffect, useState } from "react";
import { trackEvent, type RegistrationSource } from "@/lib/event";
import EventForm from "./event-form";

/** The page's form: arriving through the QR code (?src=qr) is counted as a scan. */
export default function PageForm() {
  const [source, setSource] = useState<RegistrationSource>("page");
  useEffect(() => {
    const qr = new URLSearchParams(window.location.search).get("src") === "qr";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the URL after hydration
    if (qr) setSource("qr");
    trackEvent("view");
    if (qr) trackEvent("qr_scan");
  }, []);
  return <EventForm source={source} showCountdown={false} />;
}
