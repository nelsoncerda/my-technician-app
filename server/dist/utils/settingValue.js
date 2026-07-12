"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasEquivalentSettingValues = exports.normalizeSettingValue = exports.cleanSettingValue = void 0;
const cleanSettingValue = (value) => {
    return value.trim().replace(/\s+/g, ' ');
};
exports.cleanSettingValue = cleanSettingValue;
const normalizeSettingValue = (value) => {
    return (0, exports.cleanSettingValue)(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('es');
};
exports.normalizeSettingValue = normalizeSettingValue;
const hasEquivalentSettingValues = (values) => {
    const normalizedValues = values.map(exports.normalizeSettingValue);
    return new Set(normalizedValues).size !== normalizedValues.length;
};
exports.hasEquivalentSettingValues = hasEquivalentSettingValues;
