// src/core/builder/segpackExamples.ts
import { createSegpack } from "./createSegpack";
import { createDefaultFactories } from "./segpackFactories";
import { attachMarkupToFault, attachMarkupToPhoto, attachPartToFault, attachPhotoToCompliance, attachPhotoToFault, attachReplacementToFault, linkComplianceToFault, linkComplianceToSystem, } from "./segpackMutators";
const factories = createDefaultFactories();
export function createMinimalExampleSegpack() {
    const site = factories.createSite({
        id: "site-min-001",
        name: "Example Site",
        clientName: "Example Client",
        siteType: "commercial",
        status: "active",
        address: {
            line1: "1 Example Street",
            city: "Dublin",
            country: "Ireland",
        },
    });
    const system = factories.createSystem({
        id: "sys-min-001",
        siteId: site.id,
        name: "Fire Alarm System",
        discipline: "fire-alarm",
        category: "life-safety",
        status: "active",
        lifecycle: "existing",
        manufacturer: "Generic",
        model: "Addressable Panel",
    });
    const fault = factories.createFault({
        id: "fault-min-001",
        siteId: site.id,
        systemId: system.id,
        title: "Example open fault",
        category: "fault",
        status: "open",
        severity: "medium",
        priority: "p3",
        source: "engineer-observed",
    });
    return createSegpack({
        manifest: factories.createManifest({
            packageId: "segpack-minimal-001",
            createdBy: "demo-user",
            title: "Minimal Example SEGPACK",
            description: "Smallest realistic valid example pack.",
            sourceApp: "SEG Tools",
            sourceAppVersion: "0.1.0",
            exportFormat: "segpack-json",
            tags: ["example", "minimal"],
        }),
        site,
        systems: [system],
        faults: [fault],
        parts: [],
        replacements: [],
        compliance: [],
        photos: [],
        markups: [],
    });
}
export function createFireAlarmExampleSegpack() {
    const site = factories.createSite({
        id: "site-fire-001",
        name: "Riverside Retail Centre",
        clientName: "Riverside Management Ltd",
        siteType: "retail",
        status: "active",
        buildingName: "Main Shopping Block",
        buildingUse: "shop",
        address: {
            line1: "Riverside Road",
            city: "Naas",
            county: "Kildare",
            country: "Ireland",
        },
        serviceNotes: "Quarterly maintenance visit and fault investigation.",
        hazards: ["Live retail environment", "Public access areas"],
    });
    const panel = factories.createSystemDevice({
        id: "dev-fire-panel-001",
        systemId: "sys-fire-001",
        name: "Main Fire Alarm Panel",
        deviceType: "panel",
        status: "normal",
        location: {
            level: "Ground",
            room: "Security Room",
            locationText: "Security room beside loading bay entrance",
        },
        identifier: {
            manufacturer: "Morley-IAS",
            model: "ZXe",
            firmwareVersion: "7.62",
            reference: "FAP-01",
        },
        commissioned: "yes",
        powered: "yes",
        monitored: "yes",
    });
    const detector = factories.createSystemDevice({
        id: "dev-fire-det-001",
        systemId: "sys-fire-001",
        name: "Smoke Detector outside Unit 12",
        deviceType: "detector",
        status: "fault",
        location: {
            level: "Ground",
            room: "Mall Corridor",
            locationText: "Outside Unit 12 shopfront",
        },
        addressing: {
            loop: "1",
            address: "37",
            zone: "Zone 3",
        },
        identifier: {
            manufacturer: "Apollo",
            model: "Series 65",
            reference: "L1-A37",
        },
        commissioned: "yes",
        powered: "yes",
        monitored: "yes",
    });
    const loop1 = factories.createSystemCircuit({
        id: "cct-fire-loop-001",
        systemId: "sys-fire-001",
        name: "Loop 1",
        type: "loop",
        reference: "Loop 1",
        sourceDeviceId: panel.id,
        monitored: "yes",
    });
    const zone3 = factories.createSystemZone({
        id: "zone-fire-003",
        systemId: "sys-fire-001",
        name: "Ground Floor Mall East",
        zoneNumber: "3",
        zoneType: "detection",
        level: "Ground",
        coverageText: "East side mall corridor and associated shopfront areas",
    });
    const system = factories.createSystem({
        id: "sys-fire-001",
        siteId: site.id,
        name: "Addressable Fire Alarm System",
        discipline: "fire-alarm",
        category: "life-safety",
        status: "faulted",
        lifecycle: "existing",
        manufacturer: "Morley-IAS",
        model: "ZXe",
        firmwareVersion: "7.62",
        panelCount: 1,
        networked: "no",
        monitored: "yes",
        devices: [panel, detector],
        circuits: [loop1],
        zones: [zone3],
        standardRefs: ["I.S. 3218", "EN 54"],
        health: {
            overallStatus: "faulted",
            serviceable: "yes",
            compliant: "unknown",
            faultCount: 1,
            lastServiceDate: "2026-03-07T10:00:00.000Z",
        },
    });
    const part = factories.createPart({
        id: "part-fire-det-001",
        name: "Optical Smoke Detector Head",
        category: "detector",
        condition: "new",
        criticality: "recommended-spare",
        identity: {
            manufacturer: "Apollo",
            model: "Series 65 Optical",
            partCode: "55000-317",
            sku: "APOLLO-OPT-317",
        },
        stock: {
            quantity: 2,
            unit: "each",
            vanStock: "yes",
            availableQty: 2,
            lowThreshold: 1,
            mediumThreshold: 2,
            locationText: "Engineer van stock",
        },
    });
    const replacement = factories.createReplacement({
        id: "repl-fire-001",
        faultId: "fault-fire-001",
        systemId: system.id,
        deviceId: detector.id,
        circuitId: loop1.id,
        zoneId: zone3.id,
        partId: part.id,
        quantity: 1,
        title: "Replace detector head at L1-A37",
        reason: "faulty-device",
        status: "fitted",
        removed: {
            deviceId: detector.id,
            manufacturer: "Apollo",
            model: "Series 65",
            condition: "faulty",
            retainedForAnalysis: "no",
            returnedToClient: "no",
        },
        installed: {
            partId: part.id,
            configured: "yes",
            addressed: "yes",
        },
        verification: {
            functionalTest: "pass",
            causeAndEffectTest: "pass",
            monitoredCorrectly: "yes",
            notes: "Detector tested from panel after replacement and reset correctly.",
        },
        fittedAt: "2026-03-07T10:48:00.000Z",
        fittedBy: "demo-user",
        locationText: "Ground floor mall corridor outside Unit 12",
    });
    const remedial = factories.createRemedialAction({
        id: "action-fire-001",
        faultId: "fault-fire-001",
        title: "Replace faulty detector head and retest loop device",
        status: "completed",
        priority: "p2",
        requiresParts: "yes",
        partIds: [part.id],
        replacementIds: [replacement.id],
        labourEstimateHours: 0.5,
        completedAt: "2026-03-07T10:50:00.000Z",
        completedBy: "demo-user",
        outcome: "Detector replaced and system restored to normal.",
        verificationNotes: "Panel reset completed successfully with no further faults present.",
    });
    const fault = factories.createFault({
        id: "fault-fire-001",
        siteId: site.id,
        systemId: system.id,
        deviceId: detector.id,
        circuitId: loop1.id,
        zoneId: zone3.id,
        title: "Loop 1 detector fault at address 37",
        category: "device",
        source: "panel-indication",
        status: "resolved",
        severity: "high",
        priority: "p2",
        impact: "moderate",
        verificationStatus: "confirmed",
        location: {
            level: "Ground",
            room: "Mall Corridor",
            locationText: "Outside Unit 12",
        },
        symptom: {
            summary: "Detector on Loop 1 reported fault and remained in fault until device was changed.",
            panelText: "L1 A37 Device Fault",
            observedBehaviour: "Panel showing persistent point fault for detector address 37.",
        },
        rootCause: {
            type: "device-failure",
            summary: "Detector head failed under test conditions.",
            confirmed: "yes",
        },
        effect: {
            affectedZones: ["Zone 3"],
            affectedLoops: ["Loop 1"],
            partialSystemLoss: "yes",
            fullSystemLoss: "no",
            complianceImpact: "unknown",
        },
        firstObservedAt: "2026-03-07T10:12:00.000Z",
        lastObservedAt: "2026-03-07T10:47:00.000Z",
        resolvedAt: "2026-03-07T10:50:00.000Z",
        clientVisible: "yes",
        engineerActionRequired: "yes",
        monitoringReported: "no",
        falseAlarmRisk: "no",
        repeatIssue: "no",
        recommendedActions: [remedial],
        testResults: [
            {
                testName: "Panel fault verification",
                result: "pass",
                notes: "Fault confirmed at panel and matched field device location.",
            },
            {
                testName: "Post-replacement detector test",
                result: "pass",
                notes: "Device tested and reset correctly.",
            },
        ],
        panelReference: "FAP-01",
        standardRefs: ["I.S. 3218"],
    });
    const compliance = factories.createCompliance({
        id: "comp-fire-001",
        title: "Fault rectification and restoration of detector coverage",
        subject: {
            scope: "system",
            siteId: site.id,
            systemId: system.id,
            deviceId: detector.id,
            zoneId: zone3.id,
            locationText: "Ground floor east mall corridor",
        },
        category: "maintenance",
        status: "pass",
        result: "pass",
        severity: "medium",
        riskLevel: "low",
        summary: "Detector fault rectified and coverage restored.",
        finding: "Single faulty detector head identified and replaced.",
        implication: "Temporary reduction in automatic detection at the affected point until replacement.",
        reference: {
            authority: "is",
            standard: "I.S. 3218",
            clause: "maintenance / fault rectification",
            title: "Routine inspection and servicing obligations",
        },
        verified: "yes",
        verifiedAt: "2026-03-07T10:55:00.000Z",
        verifiedBy: "demo-user",
    });
    const photo1 = factories.createPhoto({
        id: "photo-fire-001",
        title: "Detector location before replacement",
        category: "before",
        fileName: "detector-before.jpg",
        uri: "/examples/fire/detector-before.jpg",
        mimeType: "image/jpeg",
        refs: {
            siteId: site.id,
            systemId: system.id,
            deviceId: detector.id,
        },
        context: {
            level: "Ground",
            room: "Mall Corridor",
            locationText: "Outside Unit 12",
            viewpoint: "Looking east along mall corridor",
        },
    });
    const photo2 = factories.createPhoto({
        id: "photo-fire-002",
        title: "Detector after replacement",
        category: "after",
        fileName: "detector-after.jpg",
        uri: "/examples/fire/detector-after.jpg",
        mimeType: "image/jpeg",
        refs: {
            siteId: site.id,
            systemId: system.id,
            deviceId: detector.id,
        },
        context: {
            level: "Ground",
            room: "Mall Corridor",
            locationText: "Outside Unit 12",
        },
    });
    const markup = factories.createMarkup({
        id: "markup-fire-001",
        shape: "circle",
        subjectType: "fault",
        severity: "high",
        refs: {
            photoId: photo1.id,
            systemId: system.id,
            deviceId: detector.id,
        },
        style: {
            colour: "red",
            strokeWidth: 3,
            fillOpacity: 0,
        },
        text: {
            text: "Faulty detector point",
            fontSize: 14,
            bold: "yes",
        },
        geometry: {
            rect: {
                x: 320,
                y: 110,
                width: 120,
                height: 120,
            },
        },
        visible: "yes",
        locked: "no",
    });
    let pack = createSegpack({
        manifest: factories.createManifest({
            packageId: "segpack-fire-001",
            createdBy: "demo-user",
            title: "Fire Alarm Fault Rectification Example",
            description: "Example SEGPACK showing a detector fault, replacement, evidence, and compliance record.",
            sourceApp: "SEG Tools",
            sourceAppVersion: "0.1.0",
            exportFormat: "segpack-json",
            tags: ["example", "fire-alarm", "maintenance"],
        }),
        site,
        systems: [system],
        faults: [fault],
        parts: [part],
        replacements: [replacement],
        compliance: [compliance],
        photos: [photo1, photo2],
        markups: [markup],
    });
    pack = attachPhotoToFault(pack, fault.id, photo1.id);
    pack = attachPhotoToFault(pack, fault.id, photo2.id);
    pack = attachMarkupToFault(pack, fault.id, markup.id);
    pack = attachMarkupToPhoto(pack, photo1.id, markup.id);
    pack = attachPartToFault(pack, fault.id, part.id);
    pack = attachReplacementToFault(pack, fault.id, replacement.id);
    pack = linkComplianceToFault(pack, compliance.id, fault.id);
    pack = attachPhotoToCompliance(pack, compliance.id, photo2.id);
    return pack;
}
export function createCctvExampleSegpack() {
    const site = factories.createSite({
        id: "site-cctv-001",
        name: "Westgate Business Park",
        clientName: "Westgate Facilities",
        siteType: "commercial",
        status: "active",
        buildingName: "Block A",
        buildingUse: "office",
        address: {
            line1: "Westgate Avenue",
            city: "Newbridge",
            county: "Kildare",
            country: "Ireland",
        },
    });
    const camera = factories.createSystemDevice({
        id: "dev-cctv-cam-001",
        systemId: "sys-cctv-001",
        name: "Front gate overview camera",
        deviceType: "camera",
        status: "fault",
        location: {
            level: "External",
            locationText: "Mounted on gate pillar facing inbound traffic",
        },
        identifier: {
            manufacturer: "Hikvision",
            model: "4MP IR Bullet",
            reference: "CAM-01",
            ipAddress: "192.168.30.21",
        },
        powered: "yes",
        monitored: "yes",
        commissioned: "yes",
    });
    const nvr = factories.createSystemDevice({
        id: "dev-cctv-nvr-001",
        systemId: "sys-cctv-001",
        name: "Main NVR",
        deviceType: "nvr",
        status: "normal",
        location: {
            level: "Ground",
            room: "Comms Room",
            locationText: "Rack 1",
        },
        identifier: {
            manufacturer: "Hikvision",
            model: "NVR",
            reference: "NVR-01",
        },
        powered: "yes",
        monitored: "yes",
        commissioned: "yes",
    });
    const switchNode = factories.createSystemNetworkNode({
        id: "node-cctv-001",
        systemId: "sys-cctv-001",
        name: "Gate PoE Switch",
        nodeType: "switch",
        ipAddress: "192.168.30.5",
        vlan: "30",
        locationText: "Gate cabinet",
    });
    const system = factories.createSystem({
        id: "sys-cctv-001",
        siteId: site.id,
        name: "CCTV System",
        discipline: "cctv",
        category: "security",
        status: "faulted",
        lifecycle: "existing",
        manufacturer: "Hikvision",
        model: "IP CCTV",
        networked: "yes",
        monitored: "yes",
        devices: [camera, nvr],
        networkNodes: [switchNode],
        health: {
            overallStatus: "faulted",
            serviceable: "yes",
            compliant: "unknown",
            faultCount: 1,
            offlineCount: 1,
        },
    });
    const fault = factories.createFault({
        id: "fault-cctv-001",
        siteId: site.id,
        systemId: system.id,
        deviceId: camera.id,
        title: "Front gate camera intermittent video loss",
        category: "network",
        source: "client-reported",
        status: "open",
        severity: "medium",
        priority: "p3",
        impact: "moderate",
        verificationStatus: "confirmed",
        symptom: {
            summary: "Camera image drops intermittently and stream disconnects during live view.",
            observedBehaviour: "Video restored temporarily after reboot but drops again.",
        },
        rootCause: {
            type: "network-issue",
            summary: "Suspected intermittent network or PoE issue at gate cabinet.",
            confirmed: "no",
        },
        effect: {
            affectedCameras: ["CAM-01"],
            affectedAreas: ["Main gate entrance"],
            partialSystemLoss: "yes",
            fullSystemLoss: "no",
            monitoringImpacted: "yes",
            complianceImpact: "unknown",
        },
        location: {
            level: "External",
            locationText: "Front gate entrance",
        },
        clientVisible: "yes",
        engineerActionRequired: "yes",
        monitoringReported: "yes",
        repeatIssue: "yes",
        panelReference: "NVR-01",
    });
    const compliance = factories.createCompliance({
        id: "comp-cctv-001",
        title: "Critical entrance coverage review",
        subject: {
            scope: "system",
            siteId: site.id,
            systemId: system.id,
            deviceId: camera.id,
            locationText: "Main gate entrance",
        },
        category: "maintenance",
        status: "observation",
        result: "unknown",
        severity: "medium",
        riskLevel: "medium",
        summary: "Intermittent loss of entrance coverage should be prioritised.",
        finding: "Single camera covering main vehicle entrance reported with unstable stream.",
        implication: "Loss of recorded and live evidence at main entry point.",
        recommendation: {
            action: "Inspect switch port, PoE output, patch lead, and camera connection. Replace hardware if instability remains.",
            priority: "p2",
            mandatory: "yes",
        },
    });
    const photo = factories.createPhoto({
        id: "photo-cctv-001",
        title: "Front gate camera position",
        category: "device",
        fileName: "front-gate-camera.jpg",
        uri: "/examples/cctv/front-gate-camera.jpg",
        refs: {
            siteId: site.id,
            systemId: system.id,
            deviceId: camera.id,
        },
        context: {
            locationText: "Front gate pillar",
            viewpoint: "Taken from driveway looking toward entrance gate",
        },
    });
    const markup = factories.createMarkup({
        id: "markup-cctv-001",
        shape: "arrow",
        subjectType: "device",
        subjectId: camera.id,
        severity: "medium",
        refs: {
            photoId: photo.id,
            systemId: system.id,
            deviceId: camera.id,
        },
        style: {
            colour: "yellow",
            strokeWidth: 4,
        },
        text: {
            text: "Camera with intermittent stream loss",
            fontSize: 14,
            bold: "yes",
        },
        geometry: {
            start: { x: 120, y: 240 },
            end: { x: 300, y: 140 },
        },
    });
    let pack = createSegpack({
        manifest: factories.createManifest({
            packageId: "segpack-cctv-001",
            createdBy: "demo-user",
            title: "CCTV Intermittent Video Loss Example",
            description: "Example SEGPACK for CCTV fault diagnosis and evidence capture.",
            sourceApp: "SEG Tools",
            sourceAppVersion: "0.1.0",
            exportFormat: "segpack-json",
            tags: ["example", "cctv", "network"],
        }),
        site,
        systems: [system],
        faults: [fault],
        parts: [],
        replacements: [],
        compliance: [compliance],
        photos: [photo],
        markups: [markup],
    });
    pack = attachPhotoToFault(pack, fault.id, photo.id);
    pack = attachMarkupToFault(pack, fault.id, markup.id);
    pack = attachMarkupToPhoto(pack, photo.id, markup.id);
    pack = linkComplianceToSystem(pack, compliance.id, system.id);
    return pack;
}
export function createAllExampleSegpacks() {
    return [
        createMinimalExampleSegpack(),
        createFireAlarmExampleSegpack(),
        createCctvExampleSegpack(),
    ];
}
