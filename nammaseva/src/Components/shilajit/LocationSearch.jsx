import React, { useEffect, useMemo, useRef, useState } from "react";

function placeLabel(properties) {
  return [
    [properties.housenumber, properties.street].filter(Boolean).join(" "),
    properties.name,
    properties.suburb || properties.district || properties.city || properties.county,
    properties.state,
    properties.postcode,
  ].filter((part, index, all) => part && all.indexOf(part) === index).join(", ");
}

export default function LocationSearch({ value, onChange, placeholder, ariaLabel, className = "" }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const listId = useMemo(() => `location-suggestions-${Math.random().toString(36).slice(2)}`, []);

  useEffect(() => {
    const query = value.trim();
    if (!focused || query.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: query,
          countrycode: "IN",
          lat: "13.3409",
          lon: "77.1010",
          limit: "6",
          lang: "en",
        });
        const response = await fetch(`/api/location-search?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Location search unavailable");
        const result = await response.json();
        const options = (result.features || []).map((feature) => {
          const properties = feature.properties || {};
          const [longitude, latitude] = feature.geometry?.coordinates || [];
          return {
            label: placeLabel(properties),
            area: properties.suburb || properties.city || properties.name || properties.district || properties.county || query,
            latitude,
            longitude,
          };
        }).filter((place) => place.label && Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
        setSuggestions(options);
        setOpen(focused && options.length > 0);
        setActiveIndex(-1);
      } catch (error) {
        if (error.name !== "AbortError") {
          setSuggestions([]);
          setOpen(false);
        }
      }
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value, focused]);

  function choose(place) {
    onChange(place.label, place);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
    setFocused(false);
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter" && open && activeIndex >= 0) {
      event.preventDefault();
      choose(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={`location-search ${className}`}>
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value, null)}
        onFocus={() => { setFocused(true); if (suggestions.length) setOpen(true); }}
        onBlur={() => { setFocused(false); setOpen(false); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        role="combobox"
        autoComplete="off"
      />
      {open && (
        <ul className="location-suggestions" id={listId} role="listbox" aria-label="Location suggestions">
          {suggestions.map((place, index) => (
            <li key={`${place.label}-${place.latitude}-${place.longitude}`} role="option" aria-selected={activeIndex === index}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(place)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span aria-hidden="true">⌖</span><span>{place.label}</span>
              </button>
            </li>
          ))}
          <li className="location-attribution">Search by OpenStreetMap · Photon</li>
        </ul>
      )}
    </div>
  );
}
