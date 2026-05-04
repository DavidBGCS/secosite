// src/utils/cleanFirestoreData.ts
function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function cleanFirestoreData(value) {
    if (Array.isArray(value)) {
        return value
            .map((item) => cleanFirestoreData(item))
            .filter((item) => item !== undefined);
    }
    if (isPlainObject(value)) {
        const result = {};
        for (const [key, child] of Object.entries(value)) {
            const cleaned = cleanFirestoreData(child);
            if (cleaned !== undefined) {
                result[key] = cleaned;
            }
        }
        return result;
    }
    return value;
}
