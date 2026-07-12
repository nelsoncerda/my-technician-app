import React from 'react';
import { Search, UserCheck, Wrench } from 'lucide-react';
import { getTechnicianSpecializations, normalizeSearchValue } from '../../lib/search';
import { Input } from '../ui/input';
import TechnicianRating, { type RatedTechnician } from './TechnicianRating';

interface SearchTechnician extends RatedTechnician {
  id: string;
  name: string;
  companyName?: string;
  location: string;
  specialization: string;
  specializations?: string[];
}

interface SearchAutocompleteProps {
  technicians: SearchTechnician[];
  specializations: string[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedSpecialization: string;
  selectedLocation: string;
}

type SearchSuggestion =
  | {
      key: string;
      kind: 'service';
      value: string;
      rank: number;
    }
  | {
      key: string;
      kind: 'technician';
      value: string;
      rank: number;
      technician: SearchTechnician;
    };

const MAX_SUGGESTIONS = 8;

const getMatchRank = (values: Array<string | undefined>, query: string) => {
  let bestRank = Number.POSITIVE_INFINITY;

  values.filter(Boolean).forEach((value) => {
    const normalizedValue = normalizeSearchValue(value!);
    if (normalizedValue === query) bestRank = Math.min(bestRank, 0);
    else if (normalizedValue.startsWith(query)) bestRank = Math.min(bestRank, 1);
    else if (normalizedValue.includes(query)) bestRank = Math.min(bestRank, 2);
  });

  return bestRank;
};

const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  technicians,
  specializations,
  searchTerm,
  setSearchTerm,
  selectedSpecialization,
  selectedLocation,
}) => {
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const optionRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const generatedId = React.useId().replace(/:/g, '');
  const listboxId = `home-search-suggestions-${generatedId}`;

  const eligibleTechnicians = React.useMemo(
    () =>
      technicians.filter(
        (technician) =>
          (!selectedSpecialization ||
            getTechnicianSpecializations(technician).includes(selectedSpecialization)) &&
          (!selectedLocation || technician.location === selectedLocation)
      ),
    [selectedLocation, selectedSpecialization, technicians]
  );

  const suggestions = React.useMemo<SearchSuggestion[]>(() => {
    const query = normalizeSearchValue(searchTerm);
    if (!query) return [];

    const serviceNames = new Map<string, string>();
    [...specializations, ...technicians.flatMap(getTechnicianSpecializations)].forEach(
      (service) => {
        const key = normalizeSearchValue(service);
        if (key && !serviceNames.has(key)) serviceNames.set(key, service);
      }
    );

    const serviceSuggestions: SearchSuggestion[] = Array.from(serviceNames.values())
      .map((service) => ({
        key: `service:${normalizeSearchValue(service)}`,
        kind: 'service' as const,
        value: service,
        rank: getMatchRank([service], query),
      }))
      .filter((suggestion) => Number.isFinite(suggestion.rank));

    const technicianSuggestions: SearchSuggestion[] = eligibleTechnicians
      .map((technician) => ({
        key: `technician:${technician.id}`,
        kind: 'technician' as const,
        value: technician.name,
        technician,
        rank: getMatchRank(
          [
            technician.name,
            technician.companyName,
            ...getTechnicianSpecializations(technician),
          ],
          query
        ),
      }))
      .filter((suggestion) => Number.isFinite(suggestion.rank));

    return [...serviceSuggestions, ...technicianSuggestions]
      .sort((left, right) => {
        if (left.rank !== right.rank) return left.rank - right.rank;
        if (left.kind !== right.kind) return left.kind === 'service' ? -1 : 1;
        return left.value.localeCompare(right.value, 'es');
      })
      .slice(0, MAX_SUGGESTIONS);
  }, [eligibleTechnicians, searchTerm, specializations, technicians]);

  const listboxVisible = open && Boolean(normalizeSearchValue(searchTerm)) && suggestions.length > 0;
  const activeOptionId =
    listboxVisible && activeIndex >= 0
      ? `${listboxId}-option-${activeIndex}`
      : undefined;

  React.useEffect(() => {
    if (activeIndex >= suggestions.length) setActiveIndex(-1);
  }, [activeIndex, suggestions.length]);

  React.useEffect(() => {
    const activeOption = optionRefs.current[activeIndex];
    if (listboxVisible && activeOption && typeof activeOption.scrollIntoView === 'function') {
      activeOption.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, listboxVisible]);

  const selectSuggestion = (suggestion: SearchSuggestion) => {
    setSearchTerm(suggestion.value);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => {
        if (event.key === 'ArrowDown') {
          return current < 0 ? 0 : (current + 1) % suggestions.length;
        }
        return current < 0
          ? suggestions.length - 1
          : (current - 1 + suggestions.length) % suggestions.length;
      });
      return;
    }

    if (event.key === 'Enter' && listboxVisible && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div>
      <label htmlFor="home-technician-search" className="mb-1.5 block text-sm font-semibold text-slate-700">
        Nombre o servicio
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <Input
          id="home-technician-search"
          type="search"
          role="combobox"
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (normalizeSearchValue(searchTerm)) setOpen(true);
          }}
          onBlur={() => {
            setOpen(false);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ej. electricista, plomero..."
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={listboxVisible}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          className="h-12 border-stone-300 bg-white pl-10 text-base text-slate-950 placeholder:text-slate-400 focus-visible:ring-emerald-500"
        />

        {listboxVisible && (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Sugerencias de búsqueda"
            className="absolute z-40 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-stone-200 bg-white p-2 shadow-xl"
          >
            {suggestions.map((suggestion, index) => {
              const isActive = activeIndex === index;
              const optionId = `${listboxId}-option-${index}`;

              return (
                <li key={suggestion.key} role="none">
                  <button
                    ref={(node) => {
                      optionRefs.current[index] = node;
                    }}
                    id={optionId}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={isActive}
                    onPointerDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectSuggestion(suggestion)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none ${
                      isActive ? 'bg-emerald-50' : 'hover:bg-stone-50'
                    }`}
                  >
                    <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${
                      suggestion.kind === 'service'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {suggestion.kind === 'service' ? (
                        <Wrench className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <UserCheck className="h-4 w-4" aria-hidden="true" />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-900">
                        {suggestion.value}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {suggestion.kind === 'service'
                          ? 'Servicio'
                          : suggestion.technician.companyName ||
                            getTechnicianSpecializations(suggestion.technician).join(' · ')}
                      </span>
                    </span>

                    {suggestion.kind === 'technician' && (
                      <TechnicianRating
                        technician={suggestion.technician}
                        compact
                        className="flex-none"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SearchAutocomplete;
