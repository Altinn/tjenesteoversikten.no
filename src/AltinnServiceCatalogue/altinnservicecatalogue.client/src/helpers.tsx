import { useState } from 'react';
import type { AreaGroupDto, PackageDto } from './types';

export function getText(dict: Record<string, string> | undefined | null, lang: string = 'nb'): string {
  if (!dict) return '';
  return dict[lang] || Object.values(dict)[0] || '';
}

/** Extract the short accesspackage value from a URN like "urn:altinn:accesspackage:motorvognavgift" */
export function getPackageUrnValue(urn: string): string {
  const parts = urn.split(':');
  return parts[parts.length - 1];
}

/** Build a readable link to a package page, preferring the URN slug over the GUID */
export function packagePath(pkg: { id: string; urn?: string | null }): string {
  const slug = pkg.urn ? getPackageUrnValue(pkg.urn) : pkg.id;
  return `/package/${encodeURIComponent(slug)}`;
}

/**
 * Fetch the access package export in both Norwegian and English and merge them,
 * attaching nameEn/descriptionEn to each package. English is nice-to-have:
 * if that fetch fails, the Norwegian export is returned as-is.
 */
export async function fetchPackageGroupsBilingual(env: string): Promise<AreaGroupDto[]> {
  const [nbGroups, enGroups] = await Promise.all([
    fetch(`/api/v1/${env}/meta/info/accesspackages/export`).then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch packages: ${res.status}`);
      return res.json() as Promise<AreaGroupDto[]>;
    }),
    fetch(`/api/v1/${env}/meta/info/accesspackages/export?language=eng`)
      .then((res) => (res.ok ? (res.json() as Promise<AreaGroupDto[]>) : null))
      .catch(() => null),
  ]);

  if (!enGroups) return nbGroups;

  const enById = new Map<string, { name: string; description: string }>();
  for (const g of enGroups) {
    for (const a of g.areas ?? []) {
      for (const p of a.packages ?? []) {
        enById.set(p.id, { name: p.name, description: p.description });
      }
    }
  }

  return nbGroups.map((g) => ({
    ...g,
    areas: (g.areas ?? []).map((a) => ({
      ...a,
      packages: (a.packages ?? []).map((p) => {
        const en = enById.get(p.id);
        return en ? { ...p, nameEn: en.name, descriptionEn: en.description } : p;
      }),
    })),
  }));
}

export function getLocalizedPackageName(pkg: PackageDto, lang: string): string {
  return lang === 'en' && pkg.nameEn ? pkg.nameEn : pkg.name;
}

export function getLocalizedPackageDescription(pkg: PackageDto, lang: string): string {
  return lang === 'en' && pkg.descriptionEn ? pkg.descriptionEn : pkg.description;
}

/** Build a lookup that accepts package ID, full URN, or the short URN value. */
export function buildPackageLookup(groups: AreaGroupDto[]): Map<string, PackageDto> {
  const lookup = new Map<string, PackageDto>();

  for (const group of groups) {
    for (const area of group.areas ?? []) {
      for (const pkg of area.packages ?? []) {
        const packageWithArea: PackageDto = {
          ...pkg,
          area: {
            ...area,
            packages: undefined,
            group: { ...group, areas: undefined },
          },
        };

        lookup.set(pkg.id.toLowerCase(), packageWithArea);
        if (pkg.urn) {
          lookup.set(pkg.urn.toLowerCase(), packageWithArea);
          lookup.set(getPackageUrnValue(pkg.urn).toLowerCase(), packageWithArea);
        }
      }
    }
  }

  return lookup;
}

export async function fetchPackageLookupBilingual(env: string): Promise<Map<string, PackageDto>> {
  return buildPackageLookup(await fetchPackageGroupsBilingual(env));
}

/** Add bilingual display text and export metadata to a package returned by another endpoint. */
export function enrichPackageFromLookup(
  pkg: PackageDto,
  lookup: Map<string, PackageDto>,
): PackageDto {
  const localized = lookup.get(pkg.id.toLowerCase())
    ?? (pkg.urn ? lookup.get(pkg.urn.toLowerCase()) : undefined);

  if (!localized) return pkg;

  return {
    ...pkg,
    nameEn: pkg.nameEn ?? localized.nameEn,
    descriptionEn: pkg.descriptionEn ?? localized.descriptionEn,
    area: pkg.area?.group ? pkg.area : localized.area,
  };
}

export function OrgLogo({ src, alt, fallback }: { src: string; alt: string; fallback: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="text-lg font-semibold text-gray-400">
        {fallback.substring(0, 3).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={`${alt} logo`}
      className="w-12 h-12 object-contain"
      onError={() => setFailed(true)}
    />
  );
}
