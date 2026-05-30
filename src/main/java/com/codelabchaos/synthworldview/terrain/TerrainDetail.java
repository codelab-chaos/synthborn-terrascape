package com.codelabchaos.synthworldview.terrain;

public record TerrainDetail(
        int localX,
        int localZ,
        int y,
        Kind kind,
        int rgb
) {
    public enum Kind {
        TRUNK,
        FOLIAGE
    }
}
