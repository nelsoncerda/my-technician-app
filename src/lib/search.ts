export const normalizeSearchValue = (value: string): string =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');

export interface TechnicianSpecializationSource {
  specialization: string;
  specializations?: string[];
}

export const getTechnicianSpecializations = (
  technician: TechnicianSpecializationSource
): string[] => {
  const values = technician.specializations?.length
    ? technician.specializations
    : technician.specialization.split(',');

  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  );
};
