// src/core/builder/createSegpack.ts
import { createManifest } from "../packaging/manifestHelpers";
import { validateSegpack } from "../validation/validateSegpack";
function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}
function ensureArray(value) {
    return Array.isArray(value) ? value : [];
}
function upsertById(items, item) {
    const index = items.findIndex((x) => x.id === item.id);
    if (index === -1)
        return [...items, item];
    const copy = [...items];
    copy[index] = item;
    return copy;
}
function removeById(items, id) {
    return items.filter((item) => item.id !== id);
}
function createDefaultManifest(input) {
    const packageId = input.packageId?.trim() ||
        input.manifest?.packageId?.trim() ||
        `segpack-${Date.now()}`;
    const createdBy = input.createdBy?.trim() ||
        input.manifest?.createdBy?.trim() ||
        "unknown";
    return {
        ...createManifest({
            packageId,
            createdBy,
            schemaVersion: input.manifest?.schemaVersion,
            title: input.manifest?.title,
            description: input.manifest?.description,
            sourceApp: input.manifest?.sourceApp,
            sourceAppVersion: input.manifest?.sourceAppVersion,
            exportFormat: input.manifest?.exportFormat,
            tags: input.manifest?.tags,
            now: input.manifest?.createdAt,
        }),
        updatedAt: input.manifest?.updatedAt,
    };
}
export function createSegpack(input) {
    return {
        manifest: createDefaultManifest(input),
        site: deepClone(input.site),
        systems: deepClone(ensureArray(input.systems)),
        faults: deepClone(ensureArray(input.faults)),
        parts: deepClone(ensureArray(input.parts)),
        replacements: deepClone(ensureArray(input.replacements)),
        compliance: deepClone(ensureArray(input.compliance)),
        photos: deepClone(ensureArray(input.photos)),
        markups: deepClone(ensureArray(input.markups)),
    };
}
export function createSegpackBuilder(input) {
    let pack = createSegpack(input);
    const api = {
        getPack() {
            return deepClone(pack);
        },
        validate() {
            return validateSegpack(pack);
        },
        setManifest(manifest) {
            pack = { ...pack, manifest: deepClone(manifest) };
            return api;
        },
        setSite(site) {
            pack = { ...pack, site: deepClone(site) };
            return api;
        },
        addSystem(system) {
            pack = { ...pack, systems: [...pack.systems, deepClone(system)] };
            return api;
        },
        addFault(fault) {
            pack = { ...pack, faults: [...pack.faults, deepClone(fault)] };
            return api;
        },
        addPart(part) {
            pack = { ...pack, parts: [...ensureArray(pack.parts), deepClone(part)] };
            return api;
        },
        addReplacement(replacement) {
            pack = {
                ...pack,
                replacements: [...ensureArray(pack.replacements), deepClone(replacement)],
            };
            return api;
        },
        addCompliance(record) {
            pack = {
                ...pack,
                compliance: [...ensureArray(pack.compliance), deepClone(record)],
            };
            return api;
        },
        addPhoto(photo) {
            pack = {
                ...pack,
                photos: [...ensureArray(pack.photos), deepClone(photo)],
            };
            return api;
        },
        addMarkup(markup) {
            pack = {
                ...pack,
                markups: [...ensureArray(pack.markups), deepClone(markup)],
            };
            return api;
        },
        addSystems(items) {
            pack = { ...pack, systems: [...pack.systems, ...deepClone(items)] };
            return api;
        },
        addFaults(items) {
            pack = { ...pack, faults: [...pack.faults, ...deepClone(items)] };
            return api;
        },
        addParts(items) {
            pack = { ...pack, parts: [...ensureArray(pack.parts), ...deepClone(items)] };
            return api;
        },
        addReplacements(items) {
            pack = {
                ...pack,
                replacements: [...ensureArray(pack.replacements), ...deepClone(items)],
            };
            return api;
        },
        addComplianceRecords(items) {
            pack = {
                ...pack,
                compliance: [...ensureArray(pack.compliance), ...deepClone(items)],
            };
            return api;
        },
        addPhotos(items) {
            pack = {
                ...pack,
                photos: [...ensureArray(pack.photos), ...deepClone(items)],
            };
            return api;
        },
        addMarkups(items) {
            pack = {
                ...pack,
                markups: [...ensureArray(pack.markups), ...deepClone(items)],
            };
            return api;
        },
        upsertSystem(system) {
            pack = { ...pack, systems: upsertById(pack.systems, deepClone(system)) };
            return api;
        },
        upsertFault(fault) {
            pack = { ...pack, faults: upsertById(pack.faults, deepClone(fault)) };
            return api;
        },
        upsertPart(part) {
            pack = {
                ...pack,
                parts: upsertById(ensureArray(pack.parts), deepClone(part)),
            };
            return api;
        },
        upsertReplacement(replacement) {
            pack = {
                ...pack,
                replacements: upsertById(ensureArray(pack.replacements), deepClone(replacement)),
            };
            return api;
        },
        upsertCompliance(record) {
            pack = {
                ...pack,
                compliance: upsertById(ensureArray(pack.compliance), deepClone(record)),
            };
            return api;
        },
        upsertPhoto(photo) {
            pack = {
                ...pack,
                photos: upsertById(ensureArray(pack.photos), deepClone(photo)),
            };
            return api;
        },
        upsertMarkup(markup) {
            pack = {
                ...pack,
                markups: upsertById(ensureArray(pack.markups), deepClone(markup)),
            };
            return api;
        },
        removeSystem(id) {
            pack = { ...pack, systems: removeById(pack.systems, id) };
            return api;
        },
        removeFault(id) {
            pack = { ...pack, faults: removeById(pack.faults, id) };
            return api;
        },
        removePart(id) {
            pack = { ...pack, parts: removeById(ensureArray(pack.parts), id) };
            return api;
        },
        removeReplacement(id) {
            pack = {
                ...pack,
                replacements: removeById(ensureArray(pack.replacements), id),
            };
            return api;
        },
        removeCompliance(id) {
            pack = {
                ...pack,
                compliance: removeById(ensureArray(pack.compliance), id),
            };
            return api;
        },
        removePhoto(id) {
            pack = {
                ...pack,
                photos: removeById(ensureArray(pack.photos), id),
            };
            return api;
        },
        removeMarkup(id) {
            pack = {
                ...pack,
                markups: removeById(ensureArray(pack.markups), id),
            };
            return api;
        },
    };
    return api;
}
