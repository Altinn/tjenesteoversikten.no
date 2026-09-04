import { useState } from 'react';
import type { AreaDto, AreaGroupDto, PackageDto } from './types';

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
 * attaching nameEn/descriptionEn to each group, area, and package. English is nice-to-have:
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

  const enGroupsById = new Map(enGroups.map((group) => [group.id, group]));
  const enAreasById = new Map<string, AreaDto>();
  const enPackagesById = new Map<string, PackageDto>();
  for (const g of enGroups) {
    for (const a of g.areas ?? []) {
      enAreasById.set(a.id, a);
      for (const p of a.packages ?? []) {
        enPackagesById.set(p.id, p);
      }
    }
  }

  return nbGroups.map((g) => {
    const enGroup = enGroupsById.get(g.id);
    return {
      ...g,
      nameEn: enGroup?.name,
      descriptionEn: enGroup?.description,
      areas: (g.areas ?? []).map((a) => {
        const enArea = enAreasById.get(a.id);
        return {
          ...a,
          nameEn: enArea?.name,
          descriptionEn: enArea?.description,
          packages: (a.packages ?? []).map((p) => {
            const enPackage = enPackagesById.get(p.id);
            return enPackage
              ? { ...p, nameEn: enPackage.name, descriptionEn: enPackage.description }
              : p;
          }),
        };
      }),
    };
  });
}

export function getLocalizedAreaName(area: AreaDto, lang: string): string {
  return lang === 'en' && area.nameEn ? area.nameEn : area.name;
}

export function getLocalizedAreaDescription(area: AreaDto, lang: string): string {
  return lang === 'en' && area.descriptionEn ? area.descriptionEn : area.description;
}

export function getLocalizedGroupName(group: AreaGroupDto, lang: string): string {
  return lang === 'en' && group.nameEn ? group.nameEn : group.name;
}

export function getLocalizedGroupDescription(group: AreaGroupDto, lang: string): string {
  return lang === 'en' && group.descriptionEn ? group.descriptionEn : group.description;
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
    area: pkg.area
      ? {
          ...pkg.area,
          nameEn: pkg.area.nameEn ?? localized.area?.nameEn,
          descriptionEn: pkg.area.descriptionEn ?? localized.area?.descriptionEn,
          group: pkg.area.group
            ? {
                ...pkg.area.group,
                nameEn: pkg.area.group.nameEn ?? localized.area?.group?.nameEn,
                descriptionEn: pkg.area.group.descriptionEn ?? localized.area?.group?.descriptionEn,
              }
            : localized.area?.group,
        }
      : localized.area,
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
