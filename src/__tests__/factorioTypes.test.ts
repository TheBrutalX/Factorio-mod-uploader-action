import { ValidateFactorioCategory, ValidateFactorioTag, ValidateFactorioTags, ValidateFactorioLicense } from '@/types/FactorioTypes';

jest.mock('@actions/core', () => ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
}));

describe('FactorioTypes', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('ValidateFactorioCategory', () => {
        const validCategories = [
            'no-category', 'content', 'overhaul', 'tweaks',
            'utilities', 'scenarios', 'mod-packs', 'localizations', 'internal'
        ];

        validCategories.forEach(category => {
            it(`should return valid category '${category}'`, () => {
                expect(ValidateFactorioCategory(category)).toBe(category);
            });
        });

        it('should be case-insensitive', () => {
            expect(ValidateFactorioCategory('INTERNAL')).toBe('internal');
            expect(ValidateFactorioCategory('Content')).toBe('content');
        });

        it('should return undefined and warn for invalid category', () => {
            const { warning } = require('@actions/core');
            expect(ValidateFactorioCategory('invalid-category')).toBeUndefined();
            expect(warning).toHaveBeenCalledWith(
                'Invalid category: invalid-category - skipping'
            );
        });
    });

    describe('ValidateFactorioTag', () => {
        const validTags = [
            'transportation', 'logistics', 'trains', 'combat', 'armor',
            'character', 'enemies', 'environment', 'mining', 'fluids',
            'logistic-network', 'circuit-network', 'manufacturing', 'planets',
            'power', 'storage', 'blueprints', 'cheats'
        ];

        validTags.forEach(tag => {
            it(`should return valid tag '${tag}'`, () => {
                expect(ValidateFactorioTag(tag)).toBe(tag);
            });
        });

        it('should be case-insensitive', () => {
            expect(ValidateFactorioTag('COMBAT')).toBe('combat');
            expect(ValidateFactorioTag('Logistic-Network')).toBe('logistic-network');
        });

        it('should warn and return undefined for invalid tag', () => {
            const { warning } = require('@actions/core');
            expect(ValidateFactorioTag('nonexistent')).toBeUndefined();
            expect(warning).toHaveBeenCalledWith(
                'Invalid tag: nonexistent - skipping'
            );
        });
    });

    describe('ValidateFactorioTags', () => {
        it('should return empty array for undefined tags', () => {
            expect(ValidateFactorioTags(undefined)).toEqual([]);
        });

        it('should return empty array for empty tags', () => {
            expect(ValidateFactorioTags([])).toEqual([]);
        });

        it('should filter out invalid tags', () => {
            expect(ValidateFactorioTags(['combat', 'invalid1', 'power', 'invalid2']))
                .toEqual(['combat', 'power']);
        });

        it('should return all tags when all are valid', () => {
            expect(ValidateFactorioTags(['combat', 'power', 'storage']))
                .toEqual(['combat', 'power', 'storage']);
        });
    });

    describe('ValidateFactorioLicense', () => {
        it('should return undefined for no license', () => {
            expect(ValidateFactorioLicense(undefined)).toBeUndefined();
        });

        it('should return undefined for empty string', () => {
            expect(ValidateFactorioLicense('')).toBeUndefined();
        });

        it('should accept custom licenses starting with "custom_"', () => {
            expect(ValidateFactorioLicense('custom_MyLicense')).toBe('custom_MyLicense');
        });

        it('should be case-insensitive for custom licenses', () => {
            expect(ValidateFactorioLicense('CUSTOM_MyLicense')).toBe('CUSTOM_MyLicense');
        });

        // All valid license mappings
        it('should map "mit" to "default_mit"', () => {
            expect(ValidateFactorioLicense('mit')).toBe('default_mit');
        });

        it('should map "default_mit" to "default_mit"', () => {
            expect(ValidateFactorioLicense('default_mit')).toBe('default_mit');
        });

        it('should map "gplv3" to "default_gnugplv3"', () => {
            expect(ValidateFactorioLicense('gplv3')).toBe('default_gnugplv3');
        });

        it('should map "gnugplv3" to "default_gnugplv3"', () => {
            expect(ValidateFactorioLicense('gnugplv3')).toBe('default_gnugplv3');
        });

        it('should map "default_gnugplv3" to "default_gnugplv3"', () => {
            expect(ValidateFactorioLicense('default_gnugplv3')).toBe('default_gnugplv3');
        });

        it('should map "lgplv3" to "default_gnulgplv3"', () => {
            expect(ValidateFactorioLicense('lgplv3')).toBe('default_gnulgplv3');
        });

        it('should map "default_gnulgplv3" to "default_gnulgplv3"', () => {
            expect(ValidateFactorioLicense('default_gnulgplv3')).toBe('default_gnulgplv3');
        });

        it('should map "mozilla2" to "default_mozilla2"', () => {
            expect(ValidateFactorioLicense('mozilla2')).toBe('default_mozilla2');
        });

        it('should map "default_mozilla2" to "default_mozilla2"', () => {
            expect(ValidateFactorioLicense('default_mozilla2')).toBe('default_mozilla2');
        });

        it('should map "apache2" to "default_apache2"', () => {
            expect(ValidateFactorioLicense('apache2')).toBe('default_apache2');
        });

        it('should map "default_apache2" to "default_apache2"', () => {
            expect(ValidateFactorioLicense('default_apache2')).toBe('default_apache2');
        });

        it('should map "unlicense" to "default_unlicense"', () => {
            expect(ValidateFactorioLicense('unlicense')).toBe('default_unlicense');
        });

        it('should map "default_unlicense" to "default_unlicense"', () => {
            expect(ValidateFactorioLicense('default_unlicense')).toBe('default_unlicense');
        });

        it('should warn and return undefined for invalid license', () => {
            const { warning } = require('@actions/core');
            expect(ValidateFactorioLicense('invalid-license')).toBeUndefined();
            expect(warning).toHaveBeenCalledWith(
                'Invalid license: invalid-license - skipping'
            );
        });

        it('should handle license "lgplv3" (typo variant "lgnulgplv3")', () => {
            // This tests the "lgnulgplv3" case which is a typo in the original code
            expect(ValidateFactorioLicense('lgnulgplv3')).toBe('default_gnulgplv3');
        });
    });
});
