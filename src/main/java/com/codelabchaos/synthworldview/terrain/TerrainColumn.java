package com.codelabchaos.synthworldview.terrain;

public record TerrainColumn(
        int localX,
        int localZ,
        int y,
        int blockId,
        String blockKey,
        int rgb
) {
    public boolean empty() {
        return blockId == 0 || y < 0;
    }
}
