export const cleanSettingValue = (value: string): string => {
    return value.trim().replace(/\s+/g, ' ');
};

export const normalizeSettingValue = (value: string): string => {
    return cleanSettingValue(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('es');
};

export const hasEquivalentSettingValues = (values: string[]): boolean => {
    const normalizedValues = values.map(normalizeSettingValue);
    return new Set(normalizedValues).size !== normalizedValues.length;
};
