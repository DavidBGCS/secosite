// src/core/reports/segpackTextReport.ts
import { getComplianceForFault, getFaults, getOpenFaults, getPhotosForFault, getReplacementsForFault, getResolvedFaults, getSystemById, getSystems, getFaultById, getPhotos, getMarkups, getComplianceRecords, getParts, getReplacements, } from "../builder/segpackQueries";
import { getSegpackSummaryReport } from "./segpackSummary";
const DEFAULT_OPTIONS = {
    includeManifest: true,
    includeSite: true,
    includeSystems: true,
    includeFaults: true,
    includeResolvedFaults: true,
    includeCompliance: true,
    includeInventory: true,
    includeMedia: true,
    includeCounts: true,
    maxOpenFaults: 20,
    maxResolvedFaults: 10,
    maxComplianceItems: 15,
    lineBreak: "\n",
};
function clean(value) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function yesNoUnknown(value) {
    if (value === "yes")
        return "Yes";
    if (value === "no")
        return "No";
    if (value === "unknown")
        return "Unknown";
    return undefined;
}
function formatLabelValue(label, value) {
    const text = clean(value);
    return text ? `${label}: ${text}` : undefined;
}
function formatArrayLine(label, values) {
    if (!Array.isArray(values))
        return undefined;
    const filtered = values.map(clean).filter((v) => Boolean(v));
    if (filtered.length === 0)
        return undefined;
    return `${label}: ${filtered.join(", ")}`;
}
function formatSiteAddress(address) {
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
function formatSystemLine(system) {
    const bits = [
        system.name,
        system.discipline ? `(${system.discipline})` : undefined,
        system.status ? `status: ${system.status}` : undefined,
        system.manufacturer ? `make: ${system.manufacturer}` : undefined,
        system.model ? `model: ${system.model}` : undefined,
    ].filter((v) => Boolean(v));
    return `- ${bits.join(" | ")}`;
}
function formatFaultHeadline(fault, systemName) {
    const bits = [
        fault.title,
        fault.status ? `status: ${fault.status}` : undefined,
        fault.severity ? `severity: ${fault.severity}` : undefined,
        fault.priority ? `priority: ${fault.priority}` : undefined,
        systemName ? `system: ${systemName}` : undefined,
    ].filter((v) => Boolean(v));
    return `- ${bits.join(" | ")}`;
}
function formatFaultDetailLines(pack, fault, lineBreak) {
    const lines = [];
    const locationText = clean(fault.location?.locationText) ??
        [fault.location?.level, fault.location?.room]
            .map(clean)
            .filter((v) => Boolean(v))
            .join(" / ");
    const symptom = clean(fault.symptom?.summary);
    const panelText = clean(fault.symptom?.panelText);
    const rootCause = clean(fault.rootCause?.summary);
    const effectAreas = fault.effect?.affectedAreas?.filter(Boolean) ?? [];
    const standards = fault.standardRefs?.filter(Boolean) ?? [];
    const photos = getPhotosForFault(pack, fault.id);
    const replacements = getReplacementsForFault(pack, fault.id);
    const compliance = getComplianceForFault(pack, fault.id);
    const detailCandidates = [
        formatLabelValue("  Location", locationText),
        formatLabelValue("  Source", fault.source),
        formatLabelValue("  Category", fault.category),
        formatLabelValue("  Symptom", symptom),
        formatLabelValue("  Panel text", panelText),
        formatLabelValue("  Root cause", rootCause),
        formatLabelValue("  Impact", fault.impact),
        formatLabelValue("  Client visible", yesNoUnknown(fault.clientVisible)),
        formatLabelValue("  Action required", yesNoUnknown(fault.engineerActionRequired)),
        formatArrayLine("  Affected areas", effectAreas),
        formatArrayLine("  Standard refs", standards),
        photos.length ? `  Evidence photos: ${photos.length}` : undefined,
        fault.markupIds?.length ? `  Markups: ${fault.markupIds.length}` : undefined,
        fault.partIds?.length ? `  Parts linked: ${fault.partIds.length}` : undefined,
        replacements.length ? `  Replacements linked: ${replacements.length}` : undefined,
        compliance.length ? `  Compliance items linked: ${compliance.length}` : undefined,
        fault.firstObservedAt ? `  First observed: ${fault.firstObservedAt}` : undefined,
        fault.resolvedAt ? `  Resolved: ${fault.resolvedAt}` : undefined,
    ];
    for (const line of detailCandidates) {
        if (line)
            lines.push(line);
    }
    const actions = fault.recommendedActions ?? [];
    if (actions.length) {
        lines.push("  Actions:");
        for (const action of actions) {
            const actionBits = [
                action.title,
                action.status ? `status: ${action.status}` : undefined,
                action.priority ? `priority: ${action.priority}` : undefined,
            ].filter((v) => Boolean(v));
            lines.push(`    - ${actionBits.join(" | ")}`);
            if (action.outcome)
                lines.push(`      Outcome: ${action.outcome}`);
        }
    }
    const tests = fault.testResults ?? [];
    if (tests.length) {
        lines.push("  Tests:");
        for (const test of tests) {
            const testBits = [
                test.testName,
                test.result ? `result: ${test.result}` : undefined,
                test.measuredValue ? `measured: ${test.measuredValue}` : undefined,
                test.expectedValue ? `expected: ${test.expectedValue}` : undefined,
            ].filter((v) => Boolean(v));
            lines.push(`    - ${testBits.join(" | ")}`);
            if (test.notes)
                lines.push(`      Notes: ${test.notes}`);
        }
    }
    return lines.join(lineBreak).split(lineBreak);
}
function formatComplianceLine(item, relatedSystemName) {
    const bits = [
        item.title,
        item.status ? `status: ${item.status}` : undefined,
        item.result ? `result: ${item.result}` : undefined,
        item.riskLevel ? `risk: ${item.riskLevel}` : undefined,
        relatedSystemName ? `system: ${relatedSystemName}` : undefined,
    ].filter((v) => Boolean(v));
    return `- ${bits.join(" | ")}`;
}
function section(title, bodyLines, lineBreak) {
    if (bodyLines.length === 0)
        return "";
    return [title, ...bodyLines].join(lineBreak);
}
export function getSegpackTextReport(pack, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const nl = opts.lineBreak;
    const blocks = [];
    const summary = getSegpackSummaryReport(pack);
    if (opts.includeManifest) {
        const lines = [
            formatLabelValue("Package ID", pack.manifest.packageId),
            formatLabelValue("Title", pack.manifest.title),
            formatLabelValue("Description", pack.manifest.description),
            formatLabelValue("Schema version", pack.manifest.schemaVersion),
            formatLabelValue("Created at", pack.manifest.createdAt),
            formatLabelValue("Updated at", pack.manifest.updatedAt),
            formatLabelValue("Created by", pack.manifest.createdBy),
            formatLabelValue("Source app", pack.manifest.sourceApp),
            formatLabelValue("Source app version", pack.manifest.sourceAppVersion),
            formatArrayLine("Tags", pack.manifest.tags),
        ].filter((v) => Boolean(v));
        blocks.push(section("SEGPACK SUMMARY", lines, nl));
    }
    if (opts.includeSite) {
        const address = formatSiteAddress(pack.site.address);
        const contactNames = pack.site.contacts?.map((c) => {
            const name = clean(c.name);
            const role = clean(c.role);
            if (name && role)
                return `${name} (${role})`;
            return name ?? role;
        }) ?? [];
        const lines = [
            formatLabelValue("Site", pack.site.name),
            formatLabelValue("Site ID", pack.site.id),
            formatLabelValue("Client", pack.site.clientName),
            formatLabelValue("Site type", pack.site.siteType),
            formatLabelValue("Status", pack.site.status),
            formatLabelValue("Building", pack.site.buildingName),
            formatLabelValue("Campus", pack.site.campusName),
            formatLabelValue("Building use", pack.site.buildingUse),
            formatLabelValue("Address", address),
            formatArrayLine("Contacts", contactNames),
            formatArrayLine("Hazards", pack.site.hazards),
            formatLabelValue("Service notes", pack.site.serviceNotes),
            formatLabelValue("Responder info", pack.site.responderInfo),
        ].filter((v) => Boolean(v));
        blocks.push(section("SITE", lines, nl));
    }
    if (opts.includeCounts) {
        const lines = [
            `Systems: ${summary.counts.systems}`,
            `Faults: ${summary.counts.faults}`,
            `Parts: ${summary.counts.parts}`,
            `Replacements: ${summary.counts.replacements}`,
            `Compliance: ${summary.counts.compliance}`,
            `Photos: ${summary.counts.photos}`,
            `Markups: ${summary.counts.markups}`,
            `Open faults: ${summary.faults.open}`,
            `Resolved faults: ${summary.faults.resolved}`,
            `Devices: ${summary.systems.devices}`,
        ];
        blocks.push(section("COUNTS", lines, nl));
    }
    if (opts.includeSystems) {
        const systems = getSystems(pack);
        const lines = systems.length
            ? systems.flatMap((system) => {
                const row = [formatSystemLine(system)];
                if (system.health?.overallStatus) {
                    row.push(`  Health: ${system.health.overallStatus}`);
                }
                if (system.standardRefs?.length) {
                    row.push(`  Standards: ${system.standardRefs.join(", ")}`);
                }
                if (system.devices?.length) {
                    row.push(`  Devices: ${system.devices.length}`);
                }
                if (system.zones?.length) {
                    row.push(`  Zones: ${system.zones.length}`);
                }
                return row;
            })
            : ["No systems recorded."];
        blocks.push(section("SYSTEMS", lines, nl));
    }
    if (opts.includeFaults) {
        const openFaults = getOpenFaults(pack).slice(0, opts.maxOpenFaults);
        const lines = openFaults.length
            ? openFaults.flatMap((fault) => {
                const systemName = fault.systemId
                    ? getSystemById(pack, fault.systemId)?.name
                    : undefined;
                return [
                    formatFaultHeadline(fault, systemName),
                    ...formatFaultDetailLines(pack, fault, nl),
                ];
            })
            : ["No open faults recorded."];
        blocks.push(section("OPEN FAULTS", lines, nl));
    }
    if (opts.includeResolvedFaults) {
        const resolvedFaults = getResolvedFaults(pack).slice(0, opts.maxResolvedFaults);
        const lines = resolvedFaults.length
            ? resolvedFaults.map((fault) => {
                const systemName = fault.systemId
                    ? getSystemById(pack, fault.systemId)?.name
                    : undefined;
                return formatFaultHeadline(fault, systemName);
            })
            : ["No resolved faults recorded."];
        blocks.push(section("RESOLVED FAULTS", lines, nl));
    }
    if (opts.includeCompliance) {
        const items = getComplianceRecords(pack).slice(0, opts.maxComplianceItems);
        const lines = items.length
            ? items.flatMap((item) => {
                const systemName = item.subject?.systemId
                    ? getSystemById(pack, item.subject.systemId)?.name
                    : undefined;
                const row = [formatComplianceLine(item, systemName)];
                if (item.summary)
                    row.push(`  Summary: ${item.summary}`);
                if (item.finding)
                    row.push(`  Finding: ${item.finding}`);
                if (item.implication)
                    row.push(`  Implication: ${item.implication}`);
                if (item.recommendation?.action) {
                    row.push(`  Recommendation: ${item.recommendation.action}`);
                }
                return row;
            })
            : ["No compliance records recorded."];
        blocks.push(section("COMPLIANCE", lines, nl));
    }
    if (opts.includeInventory) {
        const lines = [
            `Parts recorded: ${getParts(pack).length}`,
            `Replacements recorded: ${getReplacements(pack).length}`,
        ];
        const replacementItems = getReplacements(pack).slice(0, 10);
        if (replacementItems.length) {
            lines.push("Replacement items:");
            for (const replacement of replacementItems) {
                const relatedFault = replacement.faultId
                    ? getFaultById(pack, replacement.faultId)
                    : undefined;
                const bits = [
                    replacement.title ?? replacement.id,
                    replacement.status ? `status: ${replacement.status}` : undefined,
                    replacement.reason ? `reason: ${replacement.reason}` : undefined,
                    relatedFault?.title ? `fault: ${relatedFault.title}` : undefined,
                ].filter((v) => Boolean(v));
                lines.push(`- ${bits.join(" | ")}`);
            }
        }
        blocks.push(section("INVENTORY / REMEDIALS", lines, nl));
    }
    if (opts.includeMedia) {
        const photos = getPhotos(pack);
        const markups = getMarkups(pack);
        const lines = [
            `Photos recorded: ${photos.length}`,
            `Markups recorded: ${markups.length}`,
        ];
        const recentPhotos = photos.slice(0, 10);
        if (recentPhotos.length) {
            lines.push("Photo evidence:");
            for (const photo of recentPhotos) {
                const bits = [
                    photo.title ?? photo.fileName ?? photo.id,
                    photo.category ? `category: ${photo.category}` : undefined,
                    photo.refs?.faultId ? `fault: ${photo.refs.faultId}` : undefined,
                    photo.refs?.deviceId ? `device: ${photo.refs.deviceId}` : undefined,
                ].filter((v) => Boolean(v));
                lines.push(`- ${bits.join(" | ")}`);
            }
        }
        blocks.push(section("MEDIA", lines, nl));
    }
    return blocks.filter(Boolean).join(`${nl}${nl}`);
}
export function getSegpackShortTextSummary(pack) {
    const summary = getSegpackSummaryReport(pack);
    const lines = [
        `Pack: ${summary.packageId}`,
        summary.title ? `Title: ${summary.title}` : undefined,
        `Site: ${summary.site.name}`,
        `Systems: ${summary.systems.total}`,
        `Devices: ${summary.systems.devices}`,
        `Faults: ${summary.faults.total}`,
        `Open faults: ${summary.faults.open}`,
        `Resolved faults: ${summary.faults.resolved}`,
        `Compliance: ${summary.compliance.total}`,
        `Photos: ${summary.media.photos}`,
        `Markups: ${summary.media.markups}`,
    ].filter((v) => Boolean(v));
    return lines.join("\n");
}
