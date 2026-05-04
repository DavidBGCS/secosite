// src/core/reports/segpackExportView.ts
import { getComplianceForFault, getComplianceRecords, getFaultById, getFaults, getMarkups, getMarkupsForFault, getParts, getPartsForFault, getPhotos, getPhotosForFault, getReplacements, getReplacementsForFault, getResolvedFaults, getSystemById, getSystems, getOpenFaults, } from "../builder/segpackQueries";
import { getSegpackSummaryReport } from "./segpackSummary";
const DEFAULT_OPTIONS = {
    maxOpenFaults: 100,
    maxResolvedFaults: 100,
    maxComplianceItems: 100,
    maxPhotos: 200,
    maxMarkups: 200,
    maxParts: 200,
    maxReplacements: 200,
};
function clean(value) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function toYesNoUnknown(value) {
    if (value === "yes")
        return "Yes";
    if (value === "no")
        return "No";
    if (value === "unknown")
        return "Unknown";
    return clean(value);
}
function joinDefined(parts, separator = " | ") {
    const filtered = parts.filter((v) => Boolean(v));
    return filtered.length ? filtered.join(separator) : undefined;
}
function formatAddress(address) {
    if (!address)
        return undefined;
    if (typeof address === "string")
        return clean(address);
    return joinDefined([
        address.line1,
        address.line2,
        address.line3,
        address.city,
        address.county,
        address.postcode,
        address.country,
    ], ", ");
}
function formatLocation(location) {
    if (!location)
        return undefined;
    return (clean(location.locationText) ??
        joinDefined([clean(location.level), clean(location.room)], " / "));
}
function formatReference(item) {
    if (!item.reference)
        return undefined;
    return joinDefined([
        item.reference.authority,
        item.reference.standard,
        item.reference.clause,
        item.reference.title,
    ], " - ");
}
function mapSystem(system) {
    return {
        id: system.id,
        name: system.name,
        discipline: system.discipline,
        status: system.status,
        category: system.category,
        manufacturer: system.manufacturer,
        model: system.model,
        systemCode: system.systemCode,
        systemRef: system.systemRef,
        deviceCount: system.devices?.length ?? 0,
        zoneCount: system.zones?.length ?? 0,
        circuitCount: system.circuits?.length ?? 0,
        networkNodeCount: system.networkNodes?.length ?? 0,
        powerSourceCount: system.powerSources?.length ?? 0,
        standards: system.standardRefs ?? [],
        notes: system.notes,
    };
}
function mapFault(pack, fault) {
    const systemName = fault.systemId ? getSystemById(pack, fault.systemId)?.name : undefined;
    const photos = getPhotosForFault(pack, fault.id);
    const markups = getMarkupsForFault(pack, fault.id);
    const parts = getPartsForFault(pack, fault.id);
    const replacements = getReplacementsForFault(pack, fault.id);
    const compliance = getComplianceForFault(pack, fault.id);
    return {
        id: fault.id,
        title: fault.title,
        status: fault.status,
        severity: fault.severity,
        priority: fault.priority,
        category: fault.category,
        source: fault.source,
        impact: fault.impact,
        systemName,
        deviceId: fault.deviceId,
        location: formatLocation(fault.location),
        symptom: clean(fault.symptom?.summary),
        panelText: clean(fault.symptom?.panelText),
        rootCause: clean(fault.rootCause?.summary),
        firstObservedAt: fault.firstObservedAt,
        resolvedAt: fault.resolvedAt,
        clientVisible: toYesNoUnknown(fault.clientVisible),
        actionRequired: toYesNoUnknown(fault.engineerActionRequired),
        standards: fault.standardRefs ?? [],
        actions: (fault.recommendedActions ?? []).map((action) => joinDefined([
            action.title,
            clean(action.status) ? `status: ${action.status}` : undefined,
            clean(action.priority) ? `priority: ${action.priority}` : undefined,
            clean(action.outcome),
        ], " | ") || action.title),
        tests: (fault.testResults ?? []).map((test) => joinDefined([
            test.testName,
            clean(test.result) ? `result: ${test.result}` : undefined,
            clean(test.measuredValue) ? `measured: ${test.measuredValue}` : undefined,
            clean(test.expectedValue) ? `expected: ${test.expectedValue}` : undefined,
            clean(test.notes),
        ], " | ") || test.testName),
        evidenceCounts: {
            photos: photos.length,
            markups: markups.length,
            parts: parts.length,
            replacements: replacements.length,
            compliance: compliance.length,
        },
    };
}
function mapCompliance(pack, item) {
    const faultTitles = (item.faultIds ?? [])
        .map((id) => getFaultById(pack, id)?.title)
        .filter((v) => Boolean(v));
    const directFaultTitle = item.subject?.faultId ? getFaultById(pack, item.subject.faultId)?.title : undefined;
    if (directFaultTitle && !faultTitles.includes(directFaultTitle)) {
        faultTitles.unshift(directFaultTitle);
    }
    return {
        id: item.id,
        title: item.title,
        status: item.status,
        result: item.result,
        severity: item.severity,
        riskLevel: item.riskLevel,
        category: item.category,
        scope: item.subject?.scope,
        systemName: item.subject?.systemId
            ? getSystemById(pack, item.subject.systemId)?.name
            : undefined,
        faultTitles,
        summary: item.summary,
        finding: item.finding,
        implication: item.implication,
        recommendation: item.recommendation?.action,
        reference: formatReference(item),
        dueDate: item.dueDate,
        verified: toYesNoUnknown(item.verified),
    };
}
function mapPhoto(pack, photo, allMarkups) {
    const faultTitle = photo.refs?.faultId
        ? getFaultById(pack, photo.refs.faultId)?.title
        : undefined;
    const systemName = photo.refs?.systemId
        ? getSystemById(pack, photo.refs.systemId)?.name
        : undefined;
    const markupCount = allMarkups.filter((markup) => markup.refs?.photoId === photo.id).length;
    return {
        id: photo.id,
        title: photo.title ?? photo.fileName ?? photo.id,
        category: photo.category,
        fileName: photo.fileName,
        uri: photo.uri,
        mimeType: photo.mimeType,
        linkedFaultId: photo.refs?.faultId,
        linkedFaultTitle: faultTitle,
        linkedSystemName: systemName,
        linkedDeviceId: photo.refs?.deviceId,
        linkedComplianceId: photo.refs?.complianceId,
        markups: markupCount,
        location: clean(photo.context?.locationText) ??
            joinDefined([clean(photo.context?.level), clean(photo.context?.room)], " / "),
        capturedAt: photo.capture?.capturedAt,
    };
}
function mapMarkup(markup) {
    return {
        id: markup.id,
        shape: markup.shape,
        subjectType: markup.subjectType,
        subjectId: markup.subjectId,
        severity: markup.severity,
        linkedPhotoId: markup.refs?.photoId,
        linkedFaultId: markup.refs?.faultId,
        linkedComplianceId: markup.refs?.complianceId,
        text: markup.text?.text,
    };
}
function mapReplacement(pack, replacement) {
    const part = replacement.partId
        ? getParts(pack).find((item) => item.id === replacement.partId)
        : undefined;
    const fault = replacement.faultId ? getFaultById(pack, replacement.faultId) : undefined;
    return {
        id: replacement.id,
        title: replacement.title,
        status: replacement.status,
        reason: replacement.reason,
        quantity: replacement.quantity,
        partId: replacement.partId,
        partName: part?.name,
        faultId: replacement.faultId,
        faultTitle: fault?.title,
        fittedAt: replacement.fittedAt,
        fittedBy: replacement.fittedBy,
        locationText: replacement.locationText,
    };
}
function mapPart(part) {
    return {
        id: part.id,
        name: part.name,
        category: part.category,
        manufacturer: part.identity?.manufacturer,
        model: part.identity?.model,
        partCode: part.identity?.partCode,
        sku: part.identity?.sku,
        quantity: part.stock?.quantity,
        unit: part.stock?.unit,
        condition: part.condition,
        criticality: part.criticality,
    };
}
export function getSegpackExportView(pack, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const summary = getSegpackSummaryReport(pack);
    const systems = getSystems(pack).map(mapSystem);
    const openFaults = getOpenFaults(pack)
        .slice(0, opts.maxOpenFaults)
        .map((fault) => mapFault(pack, fault));
    const resolvedFaults = getResolvedFaults(pack)
        .slice(0, opts.maxResolvedFaults)
        .map((fault) => mapFault(pack, fault));
    const compliance = getComplianceRecords(pack)
        .slice(0, opts.maxComplianceItems)
        .map((item) => mapCompliance(pack, item));
    const allMarkups = getMarkups(pack);
    const photos = getPhotos(pack)
        .slice(0, opts.maxPhotos)
        .map((photo) => mapPhoto(pack, photo, allMarkups));
    const markups = allMarkups
        .slice(0, opts.maxMarkups)
        .map(mapMarkup);
    const parts = getParts(pack)
        .slice(0, opts.maxParts)
        .map(mapPart);
    const replacements = getReplacements(pack)
        .slice(0, opts.maxReplacements)
        .map((replacement) => mapReplacement(pack, replacement));
    const contacts = pack.site.contacts?.map((contact) => joinDefined([clean(contact.name), clean(contact.role) ? `(${contact.role})` : undefined], " ")).filter((v) => Boolean(v)) ?? [];
    const siteFields = [
        { label: "Site ID", value: pack.site.id },
        ...(clean(pack.site.clientName)
            ? [{ label: "Client", value: pack.site.clientName }]
            : []),
        ...(clean(pack.site.siteType)
            ? [{ label: "Site type", value: pack.site.siteType }]
            : []),
        ...(clean(pack.site.status)
            ? [{ label: "Status", value: pack.site.status }]
            : []),
        ...(clean(pack.site.buildingName)
            ? [{ label: "Building", value: pack.site.buildingName }]
            : []),
        ...(clean(pack.site.campusName)
            ? [{ label: "Campus", value: pack.site.campusName }]
            : []),
        ...(clean(pack.site.buildingUse)
            ? [{ label: "Building use", value: pack.site.buildingUse }]
            : []),
    ];
    return {
        header: {
            packageId: pack.manifest.packageId,
            title: pack.manifest.title,
            description: pack.manifest.description,
            schemaVersion: pack.manifest.schemaVersion,
            createdAt: pack.manifest.createdAt,
            updatedAt: pack.manifest.updatedAt,
            createdBy: pack.manifest.createdBy,
            sourceApp: pack.manifest.sourceApp,
            sourceAppVersion: pack.manifest.sourceAppVersion,
            tags: pack.manifest.tags ?? [],
        },
        site: {
            id: pack.site.id,
            name: pack.site.name,
            clientName: pack.site.clientName,
            siteType: pack.site.siteType,
            status: pack.site.status,
            buildingName: pack.site.buildingName,
            campusName: pack.site.campusName,
            buildingUse: pack.site.buildingUse,
            address: formatAddress(pack.site.address),
            contacts,
            hazards: pack.site.hazards ?? [],
            serviceNotes: pack.site.serviceNotes,
            responderInfo: pack.site.responderInfo,
            fields: siteFields,
        },
        stats: {
            systems: summary.systems.total,
            devices: summary.systems.devices,
            faults: summary.faults.total,
            openFaults: summary.faults.open,
            resolvedFaults: summary.faults.resolved,
            compliance: summary.compliance.total,
            photos: summary.media.photos,
            markups: summary.media.markups,
            parts: summary.inventory.parts,
            replacements: summary.inventory.replacements,
        },
        systems: {
            title: "Systems",
            subtitle: `${systems.length} recorded`,
            items: systems,
        },
        openFaults: {
            title: "Open Faults",
            subtitle: `${summary.faults.open} open`,
            items: openFaults,
        },
        resolvedFaults: {
            title: "Resolved Faults",
            subtitle: `${summary.faults.resolved} resolved`,
            items: resolvedFaults,
        },
        compliance: {
            title: "Compliance",
            subtitle: `${summary.compliance.total} records`,
            items: compliance,
        },
        evidence: {
            title: "Photo Evidence",
            subtitle: `${summary.media.photos} photos`,
            items: photos,
        },
        markups: {
            title: "Markups",
            subtitle: `${summary.media.markups} markups`,
            items: markups,
        },
        inventory: {
            parts: {
                title: "Parts",
                subtitle: `${summary.inventory.parts} parts`,
                items: parts,
            },
            replacements: {
                title: "Replacements",
                subtitle: `${summary.inventory.replacements} replacements`,
                items: replacements,
            },
        },
    };
}
