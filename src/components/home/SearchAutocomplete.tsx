import React from 'react';
import { Search, UserCheck, Wrench } from 'lucide-react';
import { getTechnicianSpecializations, normalizeSearchValue } from '../../lib/search';
import { Input } from '../ui/input';
import TechnicianRating, { type RatedTechnician } from './TechnicianRating';

export interface SearchTechnician extends RatedTechnician {
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
  onSuggestionSelect?: (suggestion: SearchSuggestionSelection) => void;
  onSubmit?: (value: string) => void;
}

export type SearchSuggestionSelection =
  | {
      kind: 'service';
      value: string;
    }
  | {
      kind: 'technician';
      value: string;
      technician: SearchTechnician;
    };

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
  onSuggestionSelect,
  onSubmit,
}) => {
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [selectionAnnouncement, setSelectionAnnouncement] = React.useState('');
  const [listboxPosition, setListboxPosition] = React.useState({
    above: false,
    maxHeight: 320,
  });
  const inputRef = React.useRef<HTMLInputElement>(null);
  const optionRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const generatedId = React.useId().replace(/:/g, '');
  const listboxId = `home-search-suggestions-${generatedId}`;
  const statusId = `${listboxId}-status`;

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
  const normalizedSearchTerm = normalizeSearchValue(searchTerm);
  const suggestionStatus = React.useMemo(() => {
    if (selectionAnnouncement) return selectionAnnouncement;
    if (!open || !normalizedSearchTerm) return '';
    if (suggestions.length === 0) return 'No hay sugerencias para esta búsqueda.';

    const resultLabel = suggestions.length === 1 ? 'sugerencia disponible' : 'sugerencias disponibles';
    return `${suggestions.length} ${resultLabel}. Usa las flechas para navegar y Enter para seleccionar.`;
  }, [normalizedSearchTerm, open, selectionAnnouncement, suggestions.length]);

  React.useLayoutEffect(() => {
    if (!listboxVisible) return;

    const updateListboxPosition = () => {
      const input = inputRef.current;
      if (!input) return;

      const rect = input.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
      const spaceBelow = Math.max(0, viewportBottom - rect.bottom - 8);
      const spaceAbove = Math.max(0, rect.top - viewportTop - 8);
      const above = spaceBelow < 176 && spaceAbove > spaceBelow;
      const availableSpace = above ? spaceAbove : spaceBelow;

      setListboxPosition({
        above,
        maxHeight: Math.max(48, Math.min(320, Math.floor(availableSpace))),
      });
    };

    updateListboxPosition();
    window.addEventListener('resize', updateListboxPosition);
    window.addEventListener('scroll', updateListboxPosition, true);
    window.visualViewport?.addEventListener('resize', updateListboxPosition);
    window.visualViewport?.addEventListener('scroll', updateListboxPosition);

    return () => {
      window.removeEventListener('resize', updateListboxPosition);
      window.removeEventListener('scroll', updateListboxPosition, true);
      window.visualViewport?.removeEventListener('resize', updateListboxPosition);
      window.visualViewport?.removeEventListener('scroll', updateListboxPosition);
    };
  }, [listboxVisible]);

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
    if (suggestion.kind === 'service') {
      onSuggestionSelect?.({ kind: 'service', value: suggestion.value });
      setSelectionAnnouncement(`Servicio ${suggestion.value} seleccionado.`);
    } else {
      onSuggestionSelect?.({
        kind: 'technician',
        value: suggestion.value,
        technician: suggestion.technician,
      });
      setSelectionAnnouncement(`Técnico ${suggestion.value} seleccionado.`);
    }
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;

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

    if (event.key === 'Enter') {
      event.preventDefault();

      if (listboxVisible && activeIndex >= 0) {
        selectSuggestion(suggestions[activeIndex]);
      } else {
        setOpen(false);
        setActiveIndex(-1);
        setSelectionAnnouncement(
          normalizedSearchTerm ? `Búsqueda enviada: ${searchTerm.trim()}.` : 'Búsqueda enviada.'
        );
        onSubmit?.(searchTerm.trim());
      }
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div>
      <label htmlFor="home-technician-search" className="mb-1.5 block text-sm font-semibold text-brand-charcoal">
        Servicio o técnico
      </label>
      <div className="relative isolate">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-brand-ocean-500" aria-hidden="true" />
        <Input
          ref={inputRef}
          id="home-technician-search"
          type="search"
          role="combobox"
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
            setSelectionAnnouncement('');
          }}
          onFocus={() => {
            setSelectionAnnouncement('');
            if (normalizeSearchValue(searchTerm)) setOpen(true);
          }}
          onBlur={() => {
            setOpen(false);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ej. plomero o nombre del técnico"
          autoComplete="off"
          enterKeyHint="search"
          aria-autocomplete="list"
          aria-expanded={listboxVisible}
          aria-controls={listboxVisible ? listboxId : undefined}
          aria-activedescendant={activeOptionId}
          aria-describedby={statusId}
          className="h-12 scroll-my-24 border-brand-control bg-brand-cream pl-10 text-base text-brand-charcoal placeholder:text-brand-muted focus-visible:ring-brand-ocean-500"
        />

        <span id={statusId} role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {suggestionStatus}
        </span>

        {listboxVisible && (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Sugerencias de búsqueda"
            className={`absolute z-40 w-full overscroll-contain overflow-y-auto scroll-pb-[env(safe-area-inset-bottom)] rounded-2xl border border-brand-border bg-brand-cream p-2 shadow-xl [scrollbar-gutter:stable] ${
              listboxPosition.above ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
            style={{ maxHeight: `${listboxPosition.maxHeight}px` }}
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
                    className={`flex w-full touch-manipulation items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none ${
                      isActive ? 'bg-brand-ocean-50 ring-2 ring-inset ring-brand-ocean-500' : 'hover:bg-brand-sand'
                    }`}
                  >
                    <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${
                      suggestion.kind === 'service'
                        ? 'bg-brand-clay-100 text-brand-clay-700'
                        : 'bg-brand-ocean-50 text-brand-ocean-600'
                    }`}>
                      {suggestion.kind === 'service' ? (
                        <Wrench className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <UserCheck className="h-4 w-4" aria-hidden="true" />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-brand-charcoal">
                        {suggestion.value}
                      </span>
                      <span className="block truncate text-xs text-brand-muted">
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
