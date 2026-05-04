// src/core/builder/assetServiceMatrix.ts
function normalize(value) {
    return (value ?? "").trim().toLowerCase();
}
function matchesSearch(asset, search) {
    const q = normalize(search);
    if (!q)
        return true;
    const haystack = [
        asset.reference,
        asset.assetType,
        asset.description,
        asset.locationText,
        asset.loop,
        asset.address,
        asset.zone,
        ...(asset.tags ?? []),
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
    return haystack.includes(q);
}
function ensureTickArray(asset) {
    return Array.isArray(asset.serviceTicks) ? asset.serviceTicks : [];
}
function round1(value) {
    return Math.round(value * 10) / 10;
}
function isAutomaticDetector(asset) {
    return asset.countsTowardAutoDetectionPercentage === true;
}
function getColumn(siteFile, columnKey) {
    return siteFile.serviceLayout.columns.find((c) => c.key === columnKey);
}
function getOrCreateTick(asset, columnKey) {
    const existing = ensureTickArray(asset).find((tick) => tick.columnKey === columnKey);
    if (existing)
        return existing;
    const created = {
        columnKey,
        ticked: false,
    };
    asset.serviceTicks = [...ensureTickArray(asset), created];
    return created;
}
export function getAssetsForColumn(siteFile, columnKey, options = {}) {
    const { discipline, category, tag, activeOnly = false, serviceTrackableOnly = false, search, } = options;
    return siteFile.assets.filter((asset) => {
        if (discipline && asset.discipline !== discipline)
            return false;
        if (category && asset.category !== category)
            return false;
        if (tag && !(asset.tags ?? []).map(normalize).includes(normalize(tag)))
            return false;
        if (activeOnly && !asset.active)
            return false;
        if (serviceTrackableOnly && !asset.serviceTrackable)
            return false;
        if (!matchesSearch(asset, search))
            return false;
        const tick = ensureTickArray(asset).find((t) => t.columnKey === columnKey);
        return Boolean(tick || getColumn(siteFile, columnKey));
    });
}
export function filterAssets(assets, options = {}) {
    const { discipline, category, tag, activeOnly = false, serviceTrackableOnly = false, search, } = options;
    return assets.filter((asset) => {
        if (discipline && asset.discipline !== discipline)
            return false;
        if (category && asset.category !== category)
            return false;
        if (tag && !(asset.tags ?? []).map(normalize).includes(normalize(tag)))
            return false;
        if (activeOnly && !asset.active)
            return false;
        if (serviceTrackableOnly && !asset.serviceTrackable)
            return false;
        if (!matchesSearch(asset, search))
            return false;
        return true;
    });
}
export function tickAssetForService(siteFile, assetId, columnKey, visit) {
    const asset = siteFile.assets.find((a) => a.id === assetId);
    if (!asset) {
        throw new Error(`Asset "${assetId}" not found.`);
    }
    const column = getColumn(siteFile, columnKey);
    if (!column) {
        throw new Error(`Service column "${columnKey}" not found.`);
    }
    const tick = getOrCreateTick(asset, columnKey);
    tick.ticked = true;
    tick.serviceDate = visit?.completedAt ?? visit?.startedAt ?? column.serviceDate;
    tick.visitId = visit?.id ?? tick.visitId;
    tick.testedBy = visit?.engineerName ?? tick.testedBy;
    if (!column.serviceDate) {
        column.serviceDate = tick.serviceDate;
    }
    siteFile.metadata.updatedAt = new Date().toISOString();
    return siteFile;
}
export function untickAssetForService(siteFile, assetId, columnKey) {
    const asset = siteFile.assets.find((a) => a.id === assetId);
    if (!asset) {
        throw new Error(`Asset "${assetId}" not found.`);
    }
    const tick = ensureTickArray(asset).find((t) => t.columnKey === columnKey);
    if (tick) {
        tick.ticked = false;
        tick.visitId = undefined;
        tick.testedBy = undefined;
    }
    siteFile.metadata.updatedAt = new Date().toISOString();
    return siteFile;
}
export function setServiceColumnDate(siteFile, columnKey, serviceDate) {
    const column = getColumn(siteFile, columnKey);
    if (!column) {
        throw new Error(`Service column "${columnKey}" not found.`);
    }
    column.serviceDate = serviceDate;
    siteFile.metadata.updatedAt = new Date().toISOString();
    return siteFile;
}
export function getAssetTick(asset, columnKey) {
    return ensureTickArray(asset).find((tick) => tick.columnKey === columnKey);
}
export function isAssetTicked(asset, columnKey) {
    return Boolean(getAssetTick(asset, columnKey)?.ticked);
}
export function getColumnSummary(siteFile, columnKey, options = {}) {
    const column = getColumn(siteFile, columnKey);
    if (!column) {
        throw new Error(`Service column "${columnKey}" not found.`);
    }
    const assets = filterAssets(siteFile.assets, {
        ...options,
        activeOnly: options.activeOnly ?? true,
        serviceTrackableOnly: options.serviceTrackableOnly ?? true,
    });
    const totalTrackableAssets = assets.length;
    const testedAssets = assets.filter((asset) => isAssetTicked(asset, columnKey)).length;
    return {
        columnKey,
        label: column.label,
        serviceDate: column.serviceDate,
        totalTrackableAssets,
        testedAssets,
        untestedAssets: Math.max(0, totalTrackableAssets - testedAssets),
    };
}
export function getAutomaticDetectorProgress(siteFile, columnKey, options = {}, thresholdPercentage = 25) {
    const assets = filterAssets(siteFile.assets, {
        ...options,
        activeOnly: options.activeOnly ?? true,
        serviceTrackableOnly: options.serviceTrackableOnly ?? true,
    }).filter(isAutomaticDetector);
    const eligibleTotal = assets.length;
    const testedCount = assets.filter((asset) => isAssetTicked(asset, columnKey)).length;
    const percentage = eligibleTotal > 0 ? round1((testedCount / eligibleTotal) * 100) : 0;
    const requiredCount = eligibleTotal > 0 ? Math.ceil((thresholdPercentage / 100) * eligibleTotal) : 0;
    return {
        eligibleTotal,
        testedCount,
        percentage,
        thresholdPercentage,
        thresholdMet: testedCount >= requiredCount,
        remainingToThreshold: Math.max(0, requiredCount - testedCount),
    };
}
export function getAvailableAssetTags(siteFile) {
    return Array.from(new Set(siteFile.assets.flatMap((asset) => (asset.tags ?? []).map((tag) => tag.trim()).filter(Boolean)))).sort((a, b) => a.localeCompare(b));
}
export function getAvailableAssetCategories(siteFile) {
    return Array.from(new Set(siteFile.assets.map((asset) => asset.category))).sort((a, b) => a.localeCompare(b));
}
export function autoFillServiceColumnDateFromVisit(siteFile, visit) {
    if (!visit.serviceColumnKey)
        return siteFile;
    const column = getColumn(siteFile, visit.serviceColumnKey);
    if (!column)
        return siteFile;
    if (!column.serviceDate) {
        column.serviceDate = visit.completedAt ?? visit.startedAt;
        siteFile.metadata.updatedAt = new Date().toISOString();
    }
    return siteFile;
}
export function tickAssetsForVisit(siteFile, assetIds, visit) {
    if (!visit.serviceColumnKey) {
        throw new Error(`Visit "${visit.id}" has no serviceColumnKey.`);
    }
    autoFillServiceColumnDateFromVisit(siteFile, visit);
    for (const assetId of assetIds) {
        tickAssetForService(siteFile, assetId, visit.serviceColumnKey, visit);
    }
    return siteFile;
}
export function getNextUntickedAutomaticDetectors(siteFile, columnKey, limit = 20, options = {}) {
    return filterAssets(siteFile.assets, {
        ...options,
        activeOnly: options.activeOnly ?? true,
        serviceTrackableOnly: options.serviceTrackableOnly ?? true,
    })
        .filter(isAutomaticDetector)
        .filter((asset) => !isAssetTicked(asset, columnKey))
        .slice(0, limit);
}
export function getUntickedAssetsByTag(siteFile, columnKey, tag, options = {}) {
    return filterAssets(siteFile.assets, {
        ...options,
        tag,
        activeOnly: options.activeOnly ?? true,
        serviceTrackableOnly: options.serviceTrackableOnly ?? true,
    }).filter((asset) => !isAssetTicked(asset, columnKey));
}
