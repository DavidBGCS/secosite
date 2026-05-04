// src/core/reports/visitPdfView.ts
const DEFAULT_OPTIONS = {
    reportTitle: "Service Visit Report",
    maxPhotos: 5,
};
const IRISH_TIME_ZONE = "Europe/Dublin";
const IRISH_LOCALE = "en-IE";
function clean(value) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function toDate(value) {
    if (!value)
        return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}
function formatIrishDate(value) {
    const date = toDate(value);
    if (!date)
        return undefined;
    return new Intl.DateTimeFormat(IRISH_LOCALE, {
        timeZone: IRISH_TIME_ZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
}
function formatIrishDateTime(value) {
    const date = toDate(value);
    if (!date)
        return undefined;
    return new Intl.DateTimeFormat(IRISH_LOCALE, {
        timeZone: IRISH_TIME_ZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date);
}
function formatAddress(address) {
    if (!address)
        return undefined;
    if (typeof address === "string")
        return clean(address);
    const parts = [
        address.line1,
        address.line2,
        address.line3,
        address.city,
        address.county,
        address.postcode,
        address.country,
    ]
        .map(clean)
        .filter((v) => Boolean(v));
    return parts.length ? parts.join(", ") : undefined;
}
function formatFaultLocation(fault) {
    const explicit = clean(fault.location?.locationText);
    if (explicit)
        return explicit;
    const parts = [fault.location?.level, fault.location?.room]
        .map(clean)
        .filter((v) => Boolean(v));
    return parts.length ? parts.join(" / ") : undefined;
}
function getSiteReference(siteFile) {
    return clean(siteFile.site.siteCode) ?? clean(siteFile.site.id);
}
function getMaintainedBy(siteFile) {
    const profile = siteFile.disciplineProfiles.find((p) => clean(p.maintainedBy));
    return clean(profile?.maintainedBy);
}
function getVisitOrThrow(siteFile, visitId) {
    const visit = siteFile.visits.find((v) => v.id === visitId);
    if (!visit) {
        throw new Error(`Visit "${visitId}" not found.`);
    }
    return visit;
}
function getFaultsForVisit(siteFile, visit) {
    const allFaults = [...siteFile.openFaults, ...siteFile.closedFaults];
    const ids = new Set(visit.faultIds ?? []);
    return allFaults.filter((fault) => ids.has(fault.id));
}
function getReplacementsForVisit(siteFile, visit) {
    const ids = new Set(visit.replacementIds ?? []);
    return siteFile.replacementHistory.filter((replacement) => ids.has(replacement.id));
}
function getComplianceForVisit(siteFile, visit) {
    const ids = new Set(visit.complianceIds ?? []);
    return siteFile.compliance.filter((item) => ids.has(item.id));
}
function getPhotosForVisit(siteFile, visit, maxPhotos) {
    const ids = new Set(visit.photoIds ?? []);
    return siteFile.photos.filter((photo) => ids.has(photo.id)).slice(0, maxPhotos);
}
function mapFault(siteFile, fault) {
    const systemName = fault.systemId
        ? siteFile.systems.find((s) => s.id === fault.systemId)?.name
        : undefined;
    return {
        id: fault.id,
        title: fault.title,
        severity: fault.severity,
        priority: fault.priority,
        status: fault.status,
        category: fault.category,
        systemName,
        location: formatFaultLocation(fault),
        symptom: clean(fault.symptom?.summary),
        rootCause: clean(fault.rootCause?.summary),
        outstanding: fault.status !== "resolved" && fault.status !== "closed",
    };
}
function mapReplacement(siteFile, replacement) {
    const typed = replacement;
    const linkedFaultTitle = replacement.faultId
        ? [...siteFile.openFaults, ...siteFile.closedFaults].find((f) => f.id === replacement.faultId)?.title
        : typed.faultTitleAtTime;
    const linkedAssetReference = typed.assetId
        ? siteFile.assets.find((a) => a.id === typed.assetId)?.reference ??
            typed.assetReferenceAtTime
        : typed.assetReferenceAtTime;
    const partName = clean(replacement.partId) ??
        clean(replacement.title) ??
        typed.assetTypeAtTime;
    return {
        id: replacement.id,
        title: replacement.title,
        partName,
        partId: replacement.partId,
        quantity: replacement.quantity,
        status: replacement.status,
        reason: replacement.reason,
        locationText: clean(replacement.locationText),
        linkedFaultTitle,
        linkedAssetReference,
    };
}
function mapCompliance(item) {
    return {
        id: item.id,
        title: item.title,
        status: item.status,
        result: item.result,
        riskLevel: item.riskLevel,
        summary: item.summary,
        recommendation: item.recommendation?.action,
    };
}
function mapPhoto(photo) {
    return {
        id: photo.id,
        title: photo.title ?? photo.fileName ?? photo.id,
        category: photo.category,
        caption: clean(photo.description) ?? clean(photo.notes),
        uri: photo.uri,
    };
}
function buildSummaryFields(siteFile, visit) {
    const fields = [
        { label: "Visit ID", value: visit.id },
        { label: "Engineer", value: visit.engineerName },
        { label: "Visit Type", value: visit.visitType },
        { label: "Started", value: formatIrishDateTime(visit.startedAt) ?? "—" },
    ];
    if (visit.completedAt) {
        fields.push({
            label: "Completed",
            value: formatIrishDateTime(visit.completedAt) ?? "—",
        });
    }
    if (visit.discipline) {
        fields.push({ label: "Discipline", value: visit.discipline });
    }
    if (visit.serviceColumnKey) {
        fields.push({
            label: "Service Column",
            value: visit.serviceColumnKey.toUpperCase(),
        });
    }
    if (visit.status) {
        fields.push({ label: "Visit Status", value: visit.status });
    }
    if (visit.systemStatus) {
        fields.push({ label: "System Status", value: visit.systemStatus });
    }
    if (visit.systemIds?.length) {
        const names = visit.systemIds
            .map((id) => siteFile.systems.find((s) => s.id === id)?.name)
            .filter((v) => Boolean(v));
        if (names.length) {
            fields.push({ label: "Systems", value: names.join(", ") });
        }
    }
    if (visit.faultIds?.length) {
        fields.push({ label: "Linked Faults", value: String(visit.faultIds.length) });
    }
    if (visit.replacementIds?.length) {
        fields.push({
            label: "Linked Replacements",
            value: String(visit.replacementIds.length),
        });
    }
    if (visit.photoIds?.length) {
        fields.push({ label: "Photos", value: String(visit.photoIds.length) });
    }
    return fields;
}
export function getVisitPdfView(siteFile, visitId, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const visit = getVisitOrThrow(siteFile, visitId);
    const linkedFaults = getFaultsForVisit(siteFile, visit).map((fault) => mapFault(siteFile, fault));
    const linkedReplacements = getReplacementsForVisit(siteFile, visit).map((replacement) => mapReplacement(siteFile, replacement));
    const linkedCompliance = getComplianceForVisit(siteFile, visit).map(mapCompliance);
    const linkedPhotos = getPhotosForVisit(siteFile, visit, opts.maxPhotos).map(mapPhoto);
    return {
        header: {
            reportTitle: opts.reportTitle,
            siteName: siteFile.site.name,
            siteReference: getSiteReference(siteFile),
            address: formatAddress(siteFile.site.address),
            maintainedBy: getMaintainedBy(siteFile),
            qrLabelText: siteFile.qrIdentity?.printableLabelText,
        },
        visit: {
            visitId: visit.id,
            startedAt: formatIrishDateTime(visit.startedAt) ?? "—",
            completedAt: formatIrishDateTime(visit.completedAt),
            engineerName: visit.engineerName,
            visitType: visit.visitType,
            status: visit.status,
            discipline: visit.discipline,
            serviceColumnKey: visit.serviceColumnKey,
            systemStatus: visit.systemStatus,
        },
        summaryFields: buildSummaryFields(siteFile, visit),
        workCarriedOut: clean(visit.workCarriedOut),
        faultsFound: clean(visit.faultsFound),
        actionsTaken: clean(visit.actionsTaken),
        devicesPartsReplaced: clean(visit.devicesPartsReplaced),
        zonesAreasInvolved: clean(visit.zonesAreasInvolved),
        temporaryDisables: clean(visit.temporaryDisables),
        outstandingIssues: clean(visit.outstandingIssues),
        recommendations: clean(visit.recommendations),
        linkedFaults,
        linkedReplacements,
        linkedCompliance,
        linkedPhotos,
        signature: {
            captured: visit.signature?.captured ?? false,
            signedBy: visit.signature?.signedBy,
            signedAt: formatIrishDateTime(visit.signature?.signedAt),
        },
    };
}
