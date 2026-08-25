"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export interface ThemedSelectOption {
  value: string;
  label: string;
}

interface ThemedSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ThemedSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  size?: "xs" | "sm" | "md";
  id?: string;
  name?: string;
}

export default function ThemedSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  className = "",
  size = "md",
  id,
  name,
}: ThemedSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update position of the floating dropdown
  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < 220 && rect.top > spaceBelow;

    setDropdownStyle({
      position: "fixed",
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      top: openUpwards ? undefined : `${rect.bottom + 4}px`,
      bottom: openUpwards ? `${window.innerHeight - rect.top + 4}px` : undefined,
      maxHeight: "220px",
      zIndex: 99999,
    });
  };

  // Recalculate position when opened and on scroll/resize
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    function handleScroll(e: Event) {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
        return;
      }
      setIsOpen(false);
    }

    function handleResize() {
      setIsOpen(false);
    }

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    window.addEventListener("resize", handleResize);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Find selected option label
  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const sizeClasses =
    size === "xs"
      ? "px-2.5 py-1 text-xs rounded-lg min-h-[28px]"
      : size === "sm"
      ? "px-2.5 py-1.5 text-xs rounded-lg min-h-[32px]"
      : "px-3 py-2 text-xs rounded-xl min-h-[36px]";

  const dropdownMenu = isOpen && mounted && (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden py-1 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
    >
      {options.length === 0 ? (
        <div className="px-3.5 py-2 text-xs text-slate-400 text-center">
          No options available
        </div>
      ) : (
        options.map((opt) => {
          const isSelected = String(opt.value) === String(value);
          return (
            <div
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`w-full flex items-center justify-between px-3.5 py-2 text-xs cursor-pointer transition-colors ${
                isSelected
                  ? "bg-indigo-600 text-white font-semibold shadow-2xs"
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {isSelected && <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      {/* Hidden native input for form compatibility */}
      {name && <input type="hidden" name={name} value={value} id={id} />}

      {/* Select Box Button */}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
          }
        }}
        className={`w-full flex items-center justify-between gap-2 border text-left transition-colors cursor-pointer select-none bg-slate-50 text-slate-800 ${sizeClasses} ${
          disabled
            ? "opacity-50 cursor-not-allowed bg-slate-100 border-slate-200"
            : isOpen
            ? "border-slate-400 ring-2 ring-slate-900/10 shadow-xs bg-white"
            : "border-slate-200 hover:border-slate-300 hover:bg-white"
        }`}
      >
        <span className={`truncate ${selectedOption ? "font-medium text-slate-900" : "text-slate-400"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-slate-700" : ""
          }`}
        />
      </button>

      {/* Render floating dropdown via Portal so it doesn't cause modal scrolling */}
      {mounted && typeof document !== "undefined" && createPortal(dropdownMenu, document.body)}
    </div>
  );
}
