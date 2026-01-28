import React, { useState } from 'react';
import { Filter, X, ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- Custom UI Components (Discord Theme) ---

const AccordionItem = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[#1E1F22] last:border-0 py-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left group"
      >
        <span className="text-xs font-bold text-[#949BA4] group-hover:text-[#DBDEE1] transition-colors uppercase tracking-wider">
          {title}
        </span>
        <ChevronDown 
          size={14} 
          className={cn("text-[#949BA4] transition-transform duration-200", isOpen && "transform rotate-180")} 
        />
      </button>
      {isOpen && (
        <div className="mt-2 space-y-0.5 animate-in slide-in-from-top-1 fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

const CustomCheckbox = ({ label, count, checked, onChange }) => (
  <div 
    onClick={() => onChange(!checked)}
    className={cn(
        "flex items-center justify-between cursor-pointer group px-2 py-1.5 rounded hover:bg-[#35373C] transition-colors",
        checked ? "bg-[#35373C]/50" : ""
    )}
  >
    <div className="flex items-center gap-3">
      <div className={cn(
        "w-[18px] h-[18px] rounded-[4px] border flex items-center justify-center transition-all duration-200",
        checked 
          ? "bg-[#5865F2] border-[#5865F2] text-white" 
          : "!border-[#5865F2] bg-transparent group-hover:border-[#DBDEE1]"
      )}>
        {checked && <Check size={12} strokeWidth={4} />}
      </div>
      <span className={cn(
        "text-sm font-medium transition-colors",
        checked ? "text-[#DBDEE1]" : "text-[#949BA4] group-hover:text-[#DBDEE1]"
      )}>
        {label}
      </span>
    </div>
    {count !== undefined && (
      <span className="text-xs text-[#949BA4] font-mono">{count}</span>
    )}
  </div>
);

const SortSelect = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const options = [
    { label: 'Popularity', value: 'popularity' },
    { label: 'Newest', value: 'newest' },
    { label: 'Rating', value: 'rating' },
    { label: 'Price: Low to High', value: 'price_asc' },
  ];

  const selectedLabel = options.find(o => o.value === value)?.label || value;

  return (
    <div className="relative">
      <label className="text-xs font-bold text-[#949BA4] uppercase tracking-wider mb-2 block">Sort By</label>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-[#1E1F22] hover:bg-[#1E1F22]/80 border border-transparent text-[#DBDEE1] text-sm px-3 py-2.5 rounded shadow-sm transition-all"
      >
        <span>{selectedLabel}</span>
        <ChevronDown size={16} className="text-[#949BA4]" />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 w-full mt-1 bg-[#2B2D31] border border-[#1E1F22] rounded shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 p-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-2 py-1.5 text-sm rounded hover:bg-[#404249] transition-colors mb-0.5 last:mb-0",
                  value === opt.value ? "bg-[#404249] text-white font-medium" : "text-[#949BA4]"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// --- Main Sidebar Component ---

export default function SidebarFilters({ 
  filters, 
  onFilterChange, 
  onReset,
  sortBy,
  onSortChange
}) {
  
  const GENRES = [
    { label: 'Shooter', value: '5', count: 92 },
    { label: 'RPG', value: '12', count: 124 },
    { label: 'Strategy', value: '15', count: 86 },
    { label: 'Adventure', value: '31', count: 54 },
    { label: 'MOBA', value: '36', count: 14 }
  ];

  const PLATFORMS = [
    { label: 'PC', value: '6', count: null },
    { label: 'PlayStation 5', value: '167', count: null },
    { label: 'Xbox Series X', value: '169', count: null },
    { label: 'Nintendo Switch', value: '130', count: null }
  ];

  const toggleFilter = (category, value) => {
    const current = filters[category] || [];
    const updated = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value];
    
    onFilterChange(category, updated);
  };

  return (
    <div className="bg-[#151515] rounded-lg p-4 w-full h-fit sticky top-24 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-[#DBDEE1] font-bold text-base">
          <Filter size={18} className="text-[#949BA4]" />
          <span>Filters</span>
        </div>
        <button 
          onClick={onReset}
          className="text-xs text-indigo-500 hover:underline font-medium transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Sort */}
      <div className="mb-6">
        <SortSelect value={sortBy} onChange={onSortChange} />
      </div>

      {/* Filter Sections */}
      <div className="space-y-1">
        <AccordionItem title="Genres">
          {GENRES.map(genre => (
            <CustomCheckbox 
              key={genre.value}
              label={genre.label}
              count={genre.count}
              checked={filters.genres?.includes(genre.value)}
              onChange={() => toggleFilter('genres', genre.value)}
            />
          ))}
        </AccordionItem>
        
        <AccordionItem title="Platforms">
          {PLATFORMS.map(platform => (
            <CustomCheckbox 
              key={platform.value}
              label={platform.label}
              checked={filters.platforms?.includes(platform.value)}
              onChange={() => toggleFilter('platforms', platform.value)}
            />
          ))}
        </AccordionItem>
      </div>
    </div>
  );
}
