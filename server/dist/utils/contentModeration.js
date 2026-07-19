"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.containsObjectionablePublicText = containsObjectionablePublicText;
exports.publicTextRejection = publicTextRejection;
/**
 * A deliberately small, deterministic first-pass filter for public identity
 * fields. It is not a replacement for human review; it prevents the most
 * obvious abusive names from being published or submitted to the queue.
 */
const BLOCKED_TOKENS = new Set([
    'puta',
    'puto',
    'maricon',
    'porn',
    'porno',
    'pornografia',
    'nazi',
]);
const BLOCKED_PHRASES = [
    'kill yourself',
    'te voy a matar',
    'voy a matarte',
    'muerte a',
];
const LEET_MAP = {
    '0': 'o',
    '1': 'i',
    '3': 'e',
    '4': 'a',
    '5': 's',
    '7': 't',
    '@': 'a',
    '$': 's',
};
function normalize(value) {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[013457@$]/g, (character) => LEET_MAP[character] || character)
        .replace(/[^a-z\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function collapseRepeats(value) {
    return value.replace(/(.)\1{2,}/g, '$1');
}
function containsObjectionablePublicText(value) {
    const normalized = normalize(value);
    if (!normalized)
        return false;
    if (BLOCKED_PHRASES.some((phrase) => normalized.includes(phrase))) {
        return true;
    }
    const tokens = normalized.split(' ');
    if (tokens.some((token) => BLOCKED_TOKENS.has(collapseRepeats(token)))) {
        return true;
    }
    // Catch simple punctuation-separated evasions such as "p.u.t.a" without
    // matching the same letters embedded in legitimate words like "computadora".
    let singleCharacterRun = '';
    for (const token of tokens) {
        if (token.length === 1) {
            singleCharacterRun += token;
            if (BLOCKED_TOKENS.has(singleCharacterRun))
                return true;
        }
        else {
            singleCharacterRun = '';
        }
    }
    return false;
}
function publicTextRejection(fieldLabel, value) {
    if (!value || !containsObjectionablePublicText(value))
        return null;
    return `${fieldLabel} contiene texto que no está permitido en perfiles públicos`;
}
