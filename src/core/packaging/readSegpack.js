// src/core/packaging/readSegpack.ts
import { validateSegpack, } from "../validation/validateSegpack";
function normalizeJsonError(error) {
    if (error instanceof Error)
        return error.message;
    return "Failed to parse JSON.";
}
function normalizeReadError(error) {
    if (error instanceof Error)
        return error.message;
    return "Failed to read segpack.";
}
export function parseSegpackJson(input, reviver) {
    return JSON.parse(input, reviver);
}
export function readSegpack(input, options = {}) {
    const { reviver, transform, ...validateOptions } = options;
    let parsed;
    try {
        parsed = typeof input === "string" ? parseSegpackJson(input, reviver) : input;
    }
    catch (error) {
        return {
            ok: false,
            error: `Invalid JSON: ${normalizeJsonError(error)}`,
            issues: [],
            errors: [],
            warnings: [],
        };
    }
    try {
        const validation = validateSegpack(parsed, validateOptions);
        if (!validation.ok || !validation.value) {
            return {
                ok: false,
                error: "Segpack validation failed.",
                issues: validation.issues,
                errors: validation.errors,
                warnings: validation.warnings,
            };
        }
        const value = transform ? transform(validation.value) : validation.value;
        return {
            ok: true,
            value,
            issues: validation.issues,
            warnings: validation.warnings,
        };
    }
    catch (error) {
        return {
            ok: false,
            error: normalizeReadError(error),
            issues: [],
            errors: [],
            warnings: [],
        };
    }
}
export function readSegpackOrThrow(input, options = {}) {
    const result = readSegpack(input, options);
    if (!result.ok) {
        const issueText = result.issues.length > 0
            ? "\n" +
                result.issues
                    .map((issue) => `[${issue.severity}] ${issue.path} (${issue.code}): ${issue.message}`)
                    .join("\n")
            : "";
        throw new Error(`${result.error}${issueText}`);
    }
    return result.value;
}
export function isProbablySegpack(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }
    const obj = value;
    return "manifest" in obj && "site" in obj && ("systems" in obj || "faults" in obj);
}
