// src/core/validation/validateSegpack.ts
function isObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function pushIssue(issues, severity, path, code, message) {
    issues.push({ severity, path, code, message });
}
function validateManifest(pack, issues) {
    if (!isObject(pack.manifest)) {
        pushIssue(issues, "error", "manifest", "missing", "Manifest section is required.");
        return;
    }
    if (!pack.manifest.packageId) {
        pushIssue(issues, "error", "manifest.packageId", "missing", "Manifest.packageId is required.");
    }
    if (!pack.manifest.schemaVersion) {
        pushIssue(issues, "error", "manifest.schemaVersion", "missing", "Manifest.schemaVersion is required.");
    }
    if (!pack.manifest.createdAt) {
        pushIssue(issues, "warning", "manifest.createdAt", "missing", "Manifest.createdAt not specified.");
    }
}
function validateSite(pack, issues, requireSite) {
    if (!pack.site) {
        if (requireSite) {
            pushIssue(issues, "error", "site", "missing", "Site section is required.");
        }
        return;
    }
    if (!isObject(pack.site)) {
        pushIssue(issues, "error", "site", "type", "Site must be an object.");
        return;
    }
    if (!pack.site.id) {
        pushIssue(issues, "error", "site.id", "missing", "Site.id is required.");
    }
    if (!pack.site.name) {
        pushIssue(issues, "warning", "site.name", "missing", "Site.name is recommended.");
    }
}
function validateArraySection(pack, key, issues, required = false) {
    const value = pack[key];
    if (!value) {
        if (required) {
            pushIssue(issues, "error", key, "missing", `${key} array is required.`);
        }
        return;
    }
    if (!Array.isArray(value)) {
        pushIssue(issues, "error", key, "type", `${key} must be an array.`);
        return;
    }
    value.forEach((item, index) => {
        if (!isObject(item)) {
            pushIssue(issues, "error", `${key}[${index}]`, "type", "Item must be an object.");
            return;
        }
        if (!item.id) {
            pushIssue(issues, "warning", `${key}[${index}].id`, "missing", "Item id missing.");
        }
    });
}
function validateReferences(pack, issues) {
    const systemIds = new Set();
    const faultIds = new Set();
    const partIds = new Set();
    const photoIds = new Set();
    const markupIds = new Set();
    pack.systems?.forEach((s) => s.id && systemIds.add(s.id));
    pack.faults?.forEach((f) => f.id && faultIds.add(f.id));
    pack.parts?.forEach((p) => p.id && partIds.add(p.id));
    pack.photos?.forEach((p) => p.id && photoIds.add(p.id));
    pack.markups?.forEach((m) => m.id && markupIds.add(m.id));
    pack.faults?.forEach((fault, i) => {
        if (fault.systemId && !systemIds.has(fault.systemId)) {
            pushIssue(issues, "warning", `faults[${i}].systemId`, "ref", `System reference ${fault.systemId} not found.`);
        }
        fault.photoIds?.forEach((id, pIndex) => {
            if (!photoIds.has(id)) {
                pushIssue(issues, "warning", `faults[${i}].photoIds[${pIndex}]`, "ref", `Photo reference ${id} not found.`);
            }
        });
        fault.markupIds?.forEach((id, mIndex) => {
            if (!markupIds.has(id)) {
                pushIssue(issues, "warning", `faults[${i}].markupIds[${mIndex}]`, "ref", `Markup reference ${id} not found.`);
            }
        });
        fault.partIds?.forEach((id, pIndex) => {
            if (!partIds.has(id)) {
                pushIssue(issues, "warning", `faults[${i}].partIds[${pIndex}]`, "ref", `Part reference ${id} not found.`);
            }
        });
    });
}
export function validateSegpack(input, options = {}) {
    const issues = [];
    const { requireSystems = true, requireSite = true } = options;
    if (!isObject(input)) {
        pushIssue(issues, "error", "segpack", "type", "Segpack must be an object.");
        return {
            ok: false,
            issues,
            errors: issues,
            warnings: [],
        };
    }
    const pack = input;
    validateManifest(pack, issues);
    validateSite(pack, issues, requireSite);
    validateArraySection(pack, "systems", issues, requireSystems);
    validateArraySection(pack, "faults", issues);
    validateArraySection(pack, "parts", issues);
    validateArraySection(pack, "replacements", issues);
    validateArraySection(pack, "compliance", issues);
    validateArraySection(pack, "photos", issues);
    validateArraySection(pack, "markups", issues);
    validateReferences(pack, issues);
    const errors = issues.filter((i) => i.severity === "error");
    const warnings = issues.filter((i) => i.severity === "warning");
    return {
        ok: errors.length === 0,
        value: errors.length === 0 ? pack : undefined,
        issues,
        errors,
        warnings,
    };
}
