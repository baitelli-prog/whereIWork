import React, { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";

/* FilterSearch — Tracerfy Lead Builder mode. Filter by criteria (pool, etc.)
   in a radius or ZIPs, PREVIEW for free (count + max cost), then EXECUTE to
   pay only for matching homes (5 credits = $0.10 each). Async: polls status,
   then loads rows. Feeds revealed owners into the same createGroup flow. */

const C = { accent: "#c2632a", ink: "#1d2939", sub: "#667085", line: "#e7e3dd", green: "#0a8a4a", red: "#b42318", panel: "#faf8f5" };
const ORLANDO = { lat: 28.5384, lng: -81.3789 };

let _mapsPromise = null;
function loadMaps(key) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (_mapsPromise) return _mapsPromise;
  _mapsPromise = new Promise((resolve, reject) => {
    const cb = "__ghMapsFS_" + Math.random().toString(36).slice(2);
    window[cb] = () => resolve(window.google.maps);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=geometry&callback=${cb}&v=weekly&loading=async`;
    s.async = true; s.onerror = () => reject(new Error("maps failed"));
    document.head.appendChild(s);
  });
  return _mapsPromise;
}

const call = async (payload) => {
  const { data, error } = await supabase.functions.invoke("leadbuilder", { body: payload });
  if (error) throw error;
  if (data?.error) throw new Error(data.error + (data.detail ? ": " + JSON.stringify(data.detail) : ""));
  return data;
};

export default function FilterSearch({ onCreateGroup }) {
  const key = import.meta.env.VITE_GOOGLE_MAPS_KEY;
  const mapEl = useRef(null);
  const map = useRef(null);
  const maps = useRef(null);
  const centerMarker = useRef(null);
  const circle = useRef(null);
  const pins = useRef([]);

  const [ready, setReady] = useState(false);
  const [areaMode, setAreaMode] = useState("radius"); // radius | zips
  const [center, setCenter] = useState(null);
  const [radius, setRadius] = useState(2);
  const [zips, setZips] = useState("");
  // filters
  const [pool, setPool] = useState(true);
  const [ownerOccupied, setOwnerOccupied] = useState(false);
  const [requested, setRequested] = useState(500);
  // flow
  const [phase, setPhase] = useState("idle"); // idle|previewing|previewed|executing|done
  const [preview, setPreview] = useState(null);
  const [job, setJob] = useS
