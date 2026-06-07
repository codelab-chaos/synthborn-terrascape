package com.codelabchaos.synthworldview.terrain;

public record TerrainDetail(
        int localX,
        int localZ,
        int y,
        Kind kind,
        int rgb,
        Shape shape,
        int rotationIndex,
        String blockKey
) {
    public TerrainDetail(int localX, int localZ, int y, Kind kind, int rgb) {
        this(localX, localZ, y, kind, rgb, defaultShape(kind), 0, "");
    }

    public TerrainDetail(int localX, int localZ, int y, Kind kind, int rgb, Shape shape) {
        this(localX, localZ, y, kind, rgb, shape, 0, "");
    }

    public TerrainDetail(int localX, int localZ, int y, Kind kind, int rgb, Shape shape, int rotationIndex) {
        this(localX, localZ, y, kind, rgb, shape, rotationIndex, "");
    }

    private static Shape defaultShape(Kind kind) {
        return switch (kind) {
            case COSMETIC_THIN -> Shape.POST;
            case COSMETIC_LIGHT -> Shape.LIGHT;
            case FOLIAGE_SMALL -> Shape.SMALL_FOLIAGE;
            default -> Shape.FULL;
        };
    }

    public enum Kind {
        CANOPY_VOXEL,
        COSMETIC_VOXEL,
        COSMETIC_THIN,
        COSMETIC_LIGHT,
        FOLIAGE_SMALL
    }

    public enum Shape {
        FULL,
        POST,
        LIGHT,
        SMALL_FOLIAGE,
        TOP_SLAB,
        THIN_PANEL,
        WIDE_PANEL,
        HANGING_STRIP,
        RAIL
    }
}
