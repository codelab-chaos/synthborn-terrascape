package com.codelabchaos.synthworldview.terrain;

public record TerrainColumn(
        int localX,
        int localZ,
        int y,
        int blockId,
        int fluidId,
        String blockKey,
        int rgb,
        boolean fluid
) {
    public boolean empty() {
        return !fluid && (blockId == 0 || y < 0);
    }
}
