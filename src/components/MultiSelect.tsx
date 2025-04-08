
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { X } from "lucide-react";

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export function MultiSelect({ options, selected, onChange, placeholder = "Select options..." }: MultiSelectProps) {
  const handleUnselect = (item: string) => {
    onChange(selected.filter((i) => i !== item));
  };

  const handleSelect = (item: string) => {
    if (selected.includes(item)) {
      handleUnselect(item);
    } else {
      onChange([...selected, item]);
    }
  };

  return (
    <div className="relative">
      <div className="w-full flex flex-wrap gap-1 p-2 border rounded-md min-h-10 bg-background">
        {selected.length > 0 ? (
          selected.map((item) => (
            <Badge key={item} className="m-1" variant="secondary">
              {item}
              <button
                type="button"
                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() => handleUnselect(item)}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {item}</span>
              </button>
            </Badge>
          ))
        ) : (
          <span className="text-muted-foreground text-sm pl-2 py-1">{placeholder}</span>
        )}
      </div>
      <Command className="border rounded-md mt-1 shadow-md">
        <CommandInput placeholder="Search options..." />
        <CommandEmpty>No option found.</CommandEmpty>
        <CommandGroup className="max-h-60 overflow-auto">
          {options.map((option) => (
            <CommandItem
              key={option}
              onSelect={() => handleSelect(option)}
              className="cursor-pointer"
            >
              <div
                className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${
                  selected.includes(option)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "opacity-50 border-muted-foreground"
                }`}
              >
                {selected.includes(option) && "✓"}
              </div>
              {option}
            </CommandItem>
          ))}
        </CommandGroup>
      </Command>
    </div>
  );
}
