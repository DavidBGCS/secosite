// src/core/packaging/writeSegpack.ts
import { validateSegpack, } from "../validation/validateSegpack";
function normalizeWriteError(error) {
    if (error instanceof Error)
        return error.message;
    return "Failed to write segpack.";
}
function safeCloneJsonLike(value) {
    return JSON.parse(JSON.stringify(value));
}
export function stringifySegpack(value, options = {}) {
    const { pretty = true, space, replacer } = options;
    const indent = typeof space === "number" ? space : pretty ? 2 : 0;
    return JSON.stringify(value, replacer, indent);
}
export function writeSegpack(input, options = {}) {
    const { pretty = true, space, replacer, transform, ...validateOptions } = options;
    try {
        const prepared = transform ? transform(input) : input;
        const validation = validateSegpack(prepared, validateOptions);
        if (!validation.ok || !validation.value) {
            return {
                ok: false,
                error: "Segpack validation failed.",
                issues: validation.issues,
                errors: validation.errors,
                warnings: validation.warnings,
            };
        }
        const cleanValue = safeCloneJsonLike(validation.value);
        const json = stringifySegpack(cleanValue, { pretty, space, replacer });
        return {
            ok: true,
            json,
            value: cleanValue,
            issues: validation.issues,
            warnings: validation.warnings,
        };
    }
    catch (error) {
        return {
            ok: false,
            error: normalizeWriteError(error),
            issues: [],
            errors: [],
            warnings: [],
        };
    }
}
export function writeSegpackOrThrow(input, options = {}) {
    const result = writeSegpack(input, options);
    if (!result.ok) {
        const issueText = result.issues.length > 0
            ? "\n" +
                result.issues
                    .map((issue) => `[${issue.severity}] ${issue.path} (${issue.code}): ${issue.message}`)
                    .join("\n")
            : "";
        throw new Error(`${result.error}${issueText}`);
    }
    return result.json;
}
export function createSegpackBlob(input, options = {}) {
    const json = writeSegpackOrThrow(input, options);
    return new Blob([json], { type: "application/json" });
}
export function createSegpackFileName(packageId, extension = "segpack.json") {
    const safeId = typeof packageId === "string" && packageId.trim()
        ? packageId.trim().replace(/[^\w.-]+/g, "-")
        : "segpack";
    return `${safeId}.${extension.replace(/^\.+/, "")}`;
}
