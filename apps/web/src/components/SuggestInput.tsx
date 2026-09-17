"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

interface SuggestInputProps {
  value: string;
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}

export function SuggestInput({
  value,
  onChange,
  onCommit,
  suggestions,
  placeholder,
  className,
}: SuggestInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const needle = value.trim().toLowerCase();
  const filtered = suggestions.filter(
    (s) => s.toLowerCase() !== needle && s.toLowerCase().includes(needle),
  );

  function openDropdown() {
    const el = inputRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom + window.scrollY, left: r.left + window.scrollX, width: r.width });
    }
    setIsOpen(true);
  }

  function selectSuggestion(s: string) {
    onChange(s);
    onCommit(s);
    setIsOpen(false);
  }

  return (
    <>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          openDropdown();
        }}
        onFocus={openDropdown}
        onBlur={(e) => {
          setIsOpen(false);
          onCommit(e.target.value);
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {isOpen &&
        filtered.length > 0 &&
        rect &&
        typeof document !== "undefined" &&
        createPortal(
          <ul
            style={{ position: "absolute", top: rect.top, left: rect.left, width: Math.max(rect.width, 160) }}
            className="z-50 mt-1 max-h-48 overflow-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg"
          >
            {filtered.map((s) => (
              <li
                key={s}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(s)}
                className="cursor-pointer px-3 py-1.5 text-slate-700 hover:bg-indigo-50"
              >
                {s}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}
