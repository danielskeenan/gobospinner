/**
 * Thrown when an asset cannot be found
 */
class AssetError extends Error {
}

/**
 * Asset packages
 */
export enum AssetPackage {
    GOBO = 1,
}

/**
 * Get the URL for an asset
 * @param path relative to package root
 * @param pkg package name
 * @returns {string}
 */
export function getAssetUrl(path: string, pkg: AssetPackage): string {
    switch (pkg) {
        case AssetPackage.GOBO:
            return `https://static.gobospinner.dankeenan.org/gobo_images/${path}`;
    }
    throw new AssetError(`Package "${pkg}" does not exist.`);
}
