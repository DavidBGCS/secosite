// src/utils/cleanFirestoreData.ts

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function cleanFirestoreData<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanFirestoreData(item))
      .filter((item) => item !== undefined) as T;
  }

  if (isPlainObject(value)) {
    const result: PlainObject = {};

    for (const [key, child] of Object.entries(value)) {
      const cleaned = cleanFirestoreData(child);

      if (cleaned !== undefined) {
        result[key] = cleaned;
      }
    }

    return result as T;
  }

  return value;
}