"use client";
import { useEffect } from "react";

export default function ViewBeacon({ profileId }: { profileId: number }) {
  useEffect(() => {
    const body = JSON.stringify({ type: "view" });
    navigator.sendBeacon?.(`/api/v1/profiles/${profileId}/events`, new Blob([body], { type: "application/json" }));
  }, [profileId]);
  return null;
}
