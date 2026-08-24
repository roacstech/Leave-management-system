"use client";

import React, { useState, useRef, useEffect } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);

  // Find selected option label
  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

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

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Hidden native input for form compatibility */}
      {name && <input type="hidden" name={name} value={value} id={id} />}

      {/* Select Box Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 border text-left transition-colors cursor-pointer select-none bg-base-100 text-base-content ${sizeClasses} ${
          disabled
            ? "opacity-50 cursor-not-allowed bg-base-200 border-base-300"
            : isOpen
            ? "border-primary ring-2 ring-primary/20 shadow-xs"
            : "border-base-300 hover:border-primary/50"
        }`}
      >
        <span className={`truncate ${selectedOption ? "font-medium" : "opacity-50"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 opacity-60 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-primary opacity-100" : ""
          }`}
        />
      </button>

      {/* Custom Themed Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[160px] bg-base-100 border border-base-300 rounded-xl shadow-2xl z-[9999] overflow-hidden py-1 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          {options.length === 0 ? (
            <div className="px-3.5 py-2 text-xs opacity-50 text-center">
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
                      ? "bg-primary text-primary-content font-medium shadow-2xs"
                      : "text-base-content hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
