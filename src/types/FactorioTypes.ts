//#region Categories

import { warning } from "@actions/core";

export type FactorioModCategoryType =
    | "no-category"
    | "content"
    | "overhaul"
    | "tweaks"
    | "utilities"
    | "scenarios"
    | "mod-packs"
    | "localizations"
    | "internal";

export const FactorioModCategory: FactorioModCategoryType[] = [
    "no-category",
    "content",
    "overhaul",
    "tweaks",
    "utilities",
    "scenarios",
    "mod-packs",
    "localizations",
    "internal"
];

export function ValidateFactorioCategory(category: string): FactorioModCategoryType | undefined {
    if (FactorioModCategory.includes(category.toLocaleLowerCase() as FactorioModCategoryType)) {
        return category as FactorioModCategoryType;
    }
    warning(`Invalid category: ${category} - skipping`);
    return undefined;
}
//#endregion Categories

//#region Tags

export type FactorioModTagType =
    | "transportation"
    | "logistics"
    | "pipes"
    | "trains"
    | "combat"
    | "armor"
    | "enemies"
    | "environment"
    | "mining"
    | "fluids"
    | "logistic-network"
    | "circuit-network"
    | "manufacturing"
    | "power"
    | "storage"
    | "blueprints"
    | "cheats";

export const FactorioModTags: FactorioModTagType[] = [
    "transportation",
    "logistics",
    "pipes",
    "trains",
    "combat",
    "armor",
    "enemies",
    "environment",
    "mining",
    "fluids",
    "logistic-network",
    "circuit-network",
    "manufacturing",
    "power",
    "storage",
    "blueprints",
    "cheats"
];

export function ValidateFactorioTag(tag: string): FactorioModTagType | void {
    if (FactorioModTags.includes(tag.toLocaleLowerCase() as FactorioModTagType)) {
        return tag as FactorioModTagType;
    }
    warning(`Invalid tag: ${tag} - skipping`);
}

export function ValidateFactorioTags(tags?: string[]): FactorioModTagType[] {
    if (!tags) return [];
    return tags.map((tags) => {
        return ValidateFactorioTag(tags);
    }).filter((tag) => {
        return tag !== undefined;
    }) as FactorioModTagType[];
}

//#endregion Tags

//#region License

export type FactorioModLicenseType =
    | "default_mit"
    | "default_gnugplv3"
    | "default_gnulgplv3"
    | "default_mozilla2"
    | "default_apache2"
    | "default_unlicense"

export const FactorioLicenses: FactorioModLicenseType[] = [
    "default_mit",
    "default_gnugplv3",
    "default_gnulgplv3",
    "default_mozilla2",
    "default_apache2",
    "default_unlicense"
];

export function ValidateFactorioLicense(license?: string): FactorioModLicenseType | undefined {
    if (!license) return undefined;
    const licenseLower = license.toLocaleLowerCase();
    if (licenseLower.startsWith("custom_")) return license as FactorioModLicenseType;
    switch (licenseLower) {
        case "mit":
        case "default_mit":
            return "default_mit";
        case "gplv3":
        case "gnugplv3":
        case "default_gnugplv3":
            return "default_gnugplv3";
        case "lgplv3":
        case "lgnulgplv3":
        case "default_gnulgplv3":
            return "default_gnulgplv3";
        case "mozilla2":
        case "default_mozilla2":
            return "default_mozilla2";
        case "apache2":
        case "default_apache2":
            return "default_apache2";
        case "unlicense":
        case "default_unlicense":
            return "default_unlicense";
        default:
            warning(`Invalid license: ${license} - skipping`);
            return undefined;
    }
}

//#endregion License