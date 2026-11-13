"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.error("Unable to register the service worker", error);
    });
  }, []);

  return null;
}
