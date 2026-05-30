package com.codelabchaos.synthworldview.terrain;

public record TerrainMesh(
        float[] positions,
        float[] normals,
        float[] colors,
        int[] indices,
        int vertexCount,
        int triangleCount
) {
}
