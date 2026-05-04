// src/core/builder/segpackQueries.ts
function ensureArray(value) {
    return Array.isArray(value) ? value : [];
}
function uniqueById(items) {
    const seen = new Set();
    const out = [];
    for (const item of items) {
        if (!item?.id || seen.has(item.id))
            continue;
        seen.add(item.id);
        out.push(item);
    }
    return out;
}
function includesId(list, id) {
    return Array.isArray(list) && list.includes(id);
}
export function getManifest(pack) {
    return pack.manifest;
}
export function getSite(pack) {
    return pack.site;
}
export function getSystems(pack) {
    return ensureArray(pack.systems);
}
export function getFaults(pack) {
    return ensureArray(pack.faults);
}
export function getParts(pack) {
    return ensureArray(pack.parts);
}
export function getReplacements(pack) {
    return ensureArray(pack.replacements);
}
export function getComplianceRecords(pack) {
    return ensureArray(pack.compliance);
}
export function getPhotos(pack) {
    return ensureArray(pack.photos);
}
export function getMarkups(pack) {
    return ensureArray(pack.markups);
}
export function getSystemById(pack, systemId) {
    return getSystems(pack).find((item) => item.id === systemId);
}
export function getFaultById(pack, faultId) {
    return getFaults(pack).find((item) => item.id === faultId);
}
export function getPartById(pack, partId) {
    return getParts(pack).find((item) => item.id === partId);
}
export function getReplacementById(pack, replacementId) {
    return getReplacements(pack).find((item) => item.id === replacementId);
}
export function getComplianceById(pack, complianceId) {
    return getComplianceRecords(pack).find((item) => item.id === complianceId);
}
export function getPhotoById(pack, photoId) {
    return getPhotos(pack).find((item) => item.id === photoId);
}
export function getMarkupById(pack, markupId) {
    return getMarkups(pack).find((item) => item.id === markupId);
}
export function getSystemsByDiscipline(pack, discipline) {
    return getSystems(pack).filter((item) => item.discipline === discipline);
}
export function getFaultsBySystemId(pack, systemId) {
    return getFaults(pack).filter((item) => item.systemId === systemId);
}
export function getFaultsByDeviceId(pack, deviceId) {
    return getFaults(pack).filter((item) => item.deviceId === deviceId);
}
export function getFaultsByStatus(pack, status) {
    return getFaults(pack).filter((item) => item.status === status);
}
export function getFaultsBySeverity(pack, severity) {
    return getFaults(pack).filter((item) => item.severity === severity);
}
export function getPhotosForFault(pack, faultId) {
    const fault = getFaultById(pack, faultId);
    if (!fault)
        return [];
    const linkedByIds = getPhotos(pack).filter((photo) => includesId(fault.photoIds, photo.id));
    const linkedByRefs = getPhotos(pack).filter((photo) => photo.refs?.faultId === faultId);
    return uniqueById([...linkedByIds, ...linkedByRefs]);
}
export function getMarkupsForFault(pack, faultId) {
    const fault = getFaultById(pack, faultId);
    if (!fault)
        return [];
    const linkedByIds = getMarkups(pack).filter((markup) => includesId(fault.markupIds, markup.id));
    const linkedByRefs = getMarkups(pack).filter((markup) => markup.refs?.faultId === faultId || markup.subjectId === faultId);
    return uniqueById([...linkedByIds, ...linkedByRefs]);
}
export function getPartsForFault(pack, faultId) {
    const fault = getFaultById(pack, faultId);
    if (!fault)
        return [];
    return uniqueById(getParts(pack).filter((part) => includesId(fault.partIds, part.id)));
}
export function getReplacementsForFault(pack, faultId) {
    const fault = getFaultById(pack, faultId);
    if (!fault)
        return [];
    const linkedByIds = getReplacements(pack).filter((replacement) => includesId(fault.replacementIds, replacement.id));
    const linkedByRef = getReplacements(pack).filter((replacement) => replacement.faultId === faultId);
    return uniqueById([...linkedByIds, ...linkedByRef]);
}
export function getComplianceForFault(pack, faultId) {
    return uniqueById(getComplianceRecords(pack).filter((item) => item.subject?.faultId === faultId || includesId(item.faultIds, faultId)));
}
export function getPhotosForCompliance(pack, complianceId) {
    const compliance = getComplianceById(pack, complianceId);
    if (!compliance)
        return [];
    const linkedByIds = getPhotos(pack).filter((photo) => includesId(compliance.photoIds, photo.id));
    const linkedByRefs = getPhotos(pack).filter((photo) => photo.refs?.complianceId === complianceId);
    return uniqueById([...linkedByIds, ...linkedByRefs]);
}
export function getMarkupsForCompliance(pack, complianceId) {
    const compliance = getComplianceById(pack, complianceId);
    if (!compliance)
        return [];
    const linkedByIds = getMarkups(pack).filter((markup) => includesId(compliance.markupIds, markup.id));
    const linkedByRefs = getMarkups(pack).filter((markup) => markup.refs?.complianceId === complianceId);
    return uniqueById([...linkedByIds, ...linkedByRefs]);
}
export function getComplianceForSystem(pack, systemId) {
    return getComplianceRecords(pack).filter((item) => item.subject?.systemId === systemId);
}
export function getComplianceForDevice(pack, deviceId) {
    return getComplianceRecords(pack).filter((item) => item.subject?.deviceId === deviceId);
}
export function getPhotosForSystem(pack, systemId) {
    return getPhotos(pack).filter((photo) => photo.refs?.systemId === systemId);
}
export function getPhotosForDevice(pack, deviceId) {
    return getPhotos(pack).filter((photo) => photo.refs?.deviceId === deviceId);
}
export function getMarkupsForPhoto(pack, photoId) {
    const directRefs = getMarkups(pack).filter((markup) => markup.refs?.photoId === photoId);
    const reverseRefs = getMarkups(pack).filter((markup) => {
        const photo = getPhotoById(pack, photoId);
        return includesId(photo?.refs?.markupIds, markup.id);
    });
    return uniqueById([...directRefs, ...reverseRefs]);
}
export function getPhotoForMarkup(pack, markupId) {
    const markup = getMarkupById(pack, markupId);
    if (!markup?.refs?.photoId)
        return undefined;
    return getPhotoById(pack, markup.refs.photoId);
}
export function getSystemDevices(pack, systemId) {
    return ensureArray(getSystemById(pack, systemId)?.devices);
}
export function getSystemDeviceById(pack, systemId, deviceId) {
    return getSystemDevices(pack, systemId).find((item) => item.id === deviceId);
}
export function getAllDevices(pack) {
    return getSystems(pack).flatMap((system) => ensureArray(system.devices));
}
export function getDeviceById(pack, deviceId) {
    return getAllDevices(pack).find((item) => item.id === deviceId);
}
export function getSystemCircuits(pack, systemId) {
    return ensureArray(getSystemById(pack, systemId)?.circuits);
}
export function getSystemZones(pack, systemId) {
    return ensureArray(getSystemById(pack, systemId)?.zones);
}
export function getSystemNetworkNodes(pack, systemId) {
    return ensureArray(getSystemById(pack, systemId)?.networkNodes);
}
export function getSystemPowerSources(pack, systemId) {
    return ensureArray(getSystemById(pack, systemId)?.powerSources);
}
export function getDeviceFaults(pack, deviceId) {
    return getFaultsByDeviceId(pack, deviceId);
}
export function getDevicePhotos(pack, deviceId) {
    return getPhotosForDevice(pack, deviceId);
}
export function getDeviceCompliance(pack, deviceId) {
    return getComplianceForDevice(pack, deviceId);
}
export function getOpenFaults(pack) {
    return getFaults(pack).filter((item) => item.status !== "resolved" &&
        item.status !== "closed" &&
        item.status !== "not-a-fault");
}
export function getResolvedFaults(pack) {
    return getFaults(pack).filter((item) => item.status === "resolved" || item.status === "closed");
}
export function getFaultRemedialActions(pack, faultId) {
    return ensureArray(getFaultById(pack, faultId)?.recommendedActions);
}
export function getFaultTestResults(pack, faultId) {
    return ensureArray(getFaultById(pack, faultId)?.testResults);
}
export function getPackStats(pack) {
    const systems = getSystems(pack);
    const faults = getFaults(pack);
    const parts = getParts(pack);
    const replacements = getReplacements(pack);
    const compliance = getComplianceRecords(pack);
    const photos = getPhotos(pack);
    const markups = getMarkups(pack);
    const devices = getAllDevices(pack);
    return {
        systems: systems.length,
        devices: devices.length,
        faults: faults.length,
        openFaults: getOpenFaults(pack).length,
        resolvedFaults: getResolvedFaults(pack).length,
        parts: parts.length,
        replacements: replacements.length,
        compliance: compliance.length,
        photos: photos.length,
        markups: markups.length,
    };
}
