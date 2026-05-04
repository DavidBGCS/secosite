// src/core/validation/siteFileValidation.ts
export function validateSiteFile(siteFile) {
    const errors = [];
    const warnings = [];
    if (!siteFile.metadata?.siteFileId) {
        errors.push({
            level: "error",
            message: "Site file missing metadata.siteFileId",
            path: "metadata.siteFileId",
        });
    }
    if (!siteFile.site?.name) {
        errors.push({
            level: "error",
            message: "Site name is required",
            path: "site.name",
        });
    }
    if (!siteFile.assets) {
        warnings.push({
            level: "warning",
            message: "No assets defined for site",
            path: "assets",
        });
    }
    if (!siteFile.visits) {
        warnings.push({
            level: "warning",
            message: "No visits recorded yet",
            path: "visits",
        });
    }
    if (siteFile.assets) {
        const refs = new Set();
        siteFile.assets.forEach((asset, index) => {
            if (!asset.reference) {
                errors.push({
                    level: "error",
                    message: "Asset missing reference",
                    path: `assets[${index}].reference`,
                });
            }
            if (refs.has(asset.reference)) {
                warnings.push({
                    level: "warning",
                    message: `Duplicate asset reference ${asset.reference}`,
                    path: `assets[${index}]`,
                });
            }
            refs.add(asset.reference);
        });
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}
