package com.codelabchaos.terrascape.terrain;

public record TerrainMesh(
        TerrainPart opaque,
        TerrainPart water,
        TerrainPart detail
) {
    public int vertexCount() {
        return opaque.vertexCount() + water.vertexCount() + detail.vertexCount();
    }

    public int triangleCount() {
        return opaque.triangleCount() + water.triangleCount() + detail.triangleCount();
    }

    public boolean hasWater() {
        return water.vertexCount() > 0;
    }

    public boolean hasDetail() {
        return detail.vertexCount() > 0;
    }

    public record TerrainPart(
            String name,
            float[] positions,
            float[] colors,
            int[] indices,
            int vertexCount,
            int triangleCount
    ) {
        public boolean empty() {
            return vertexCount == 0;
        }
    }
}
