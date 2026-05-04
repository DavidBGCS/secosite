export function generateId(prefix = "id") {
    const rand = Math.random().toString(36).substring(2, 8);
    const time = Date.now().toString(36);
    return `${prefix}-${time}-${rand}`;
}
