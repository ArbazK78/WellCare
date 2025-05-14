import React, { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

const MultiSelect = ({
  options = [],
  selected = [],
  onChange,
  placeholder = "Select options...",
}: MultiSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault(); // Prevent form submission
      setIsOpen(true);
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  const handleDropdownKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      setIsOpen(false);
      return;
    }

    if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
      e.preventDefault();
    }

    if (e.key === "ArrowDown") {
      setFocusedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      setFocusedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && focusedIndex >= 0) {
      handleSelect(filteredOptions[focusedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  const handleSelect = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
    setSearchValue("");
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        className="w-full flex flex-wrap items-center gap-1 p-2 border rounded-md min-h-10 bg-background text-left focus:ring-2 focus:ring-primary focus:ring-offset-2"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleTriggerKeyDown}
        tabIndex={0}
      >
        {selected.length > 0 ? (
          selected.map(item => (
            <Badge key={item} variant="secondary" className="gap-1">
              {item}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(selected.filter(i => i !== item));
                }}
                className="rounded-full outline-none focus:ring-1 focus:ring-ring"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        ) : (
          <span className="text-muted-foreground text-sm">
            {placeholder}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className="absolute z-50 w-full mt-1 border rounded-md shadow-lg bg-background"
          onKeyDown={handleDropdownKeyDown}
        >
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Search options..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full p-1 text-sm outline-none bg-transparent"
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full p-2 text-sm cursor-pointer flex items-center ${
                    selected.includes(option)
                      ? "bg-accent"
                      : "hover:bg-muted"
                  } ${
                    index === focusedIndex ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    readOnly
                    className="mr-2 h-4 w-4"
                  />
                  {option}
                </button>
              ))
            ) : (
              <div className="p-2 text-sm text-muted-foreground">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelect;