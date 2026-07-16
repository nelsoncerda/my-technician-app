import type { Settings, Technician } from '@/types/api';

export type SearchSuggestionType = 'service' | 'technician';

export interface SearchSuggestion {
  id: string;
  type: SearchSuggestionType;
  label: string;
  value: string;
  description?: string;
  technicianId?: string;
}

export interface TechnicianFilters {
  query?: string;
  specialization?: string;
  location?: string;
}

export const normalizeSearchValue = (value: string): string =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');

export function getTechnicianSpecializations(technician: Technician): string[] {
  const source = technician.specializations?.length
    ? technician.specializations
    : technician.specialization.split(',');

  return Array.from(new Set(source.map((value) => value.trim()).filter(Boolean)));
}

function includesNormalized(source: string | null | undefined, query: string): boolean {
  return source ? normalizeSearchValue(source).includes(query) : false;
}

export function technicianMatches(
  technician: Technician,
  filters: TechnicianFilters
): boolean {
  const query = normalizeSearchValue(filters.query ?? '');
  const specialization = normalizeSearchValue(filters.specialization ?? '');
  const location = normalizeSearchValue(filters.location ?? '');
  const specializations = getTechnicianSpecializations(technician);

  if (
    specialization &&
    !specializations.some((value) => normalizeSearchValue(value) === specialization)
  ) {
    return false;
  }
  if (location && normalizeSearchValue(technician.location) !== location) return false;
  if (!query) return true;

  return [
    technician.name,
    technician.companyName,
    technician.location,
    ...specializations,
  ].some((value) => includesNormalized(value, query));
}

export function filterTechnicians(
  technicians: Technician[],
  filters: TechnicianFilters
): Technician[] {
  return technicians.filter((technician) => technicianMatches(technician, filters));
}

export function createSearchSuggestions(
  query: string,
  technicians: Technician[],
  settings?: Pick<Settings, 'specializations'>,
  limit = 8
): SearchSuggestion[] {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery || limit <= 0) return [];

  const services = settings?.specializations ?? Array.from(
    new Set(technicians.flatMap(getTechnicianSpecializations))
  );

  const serviceSuggestions: SearchSuggestion[] = services
    .filter((service) => normalizeSearchValue(service).includes(normalizedQuery))
    .map((service) => ({
      id: `service:${normalizeSearchValue(service)}`,
      type: 'service',
      label: service,
      value: service,
      description: 'Servicio',
    }));

  const technicianSuggestions: SearchSuggestion[] = technicians
    .filter((technician) => technicianMatches(technician, { query }))
    .map((technician) => ({
      id: `technician:${technician.id}`,
      type: 'technician',
      label: technician.name,
      value: technician.name,
      technicianId: technician.id,
      description: getTechnicianSpecializations(technician).join(' · '),
    }));

  return [...serviceSuggestions, ...technicianSuggestions].slice(0, limit);
}
