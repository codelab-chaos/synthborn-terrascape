package com.codelabchaos.terrascape.terrain;

import org.junit.jupiter.api.Test;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GltfWriterTest {

    private static TerrainMesh.TerrainPart empty(String name) {
        return new TerrainMesh.TerrainPart(name, new float[0], new float[0], new int[0], 0, 0);
    }

    private static TerrainMesh triangleMesh() {
        float[] positions = {0, 0, 0, 1, 0, 0, 0, 1, 0};
        float[] colors = {1, 0, 0, 0, 1, 0, 0, 0, 1};
        int[] indices = {0, 1, 2};
        TerrainMesh.TerrainPart opaque = new TerrainMesh.TerrainPart("opaque", positions, colors, indices, 3, 1);
        return new TerrainMesh(opaque, empty("water"), empty("detail"));
    }

    private static int leInt(byte[] bytes, int offset) {
        return ByteBuffer.wrap(bytes, offset, 4).order(ByteOrder.LITTLE_ENDIAN).getInt();
    }

    @Test
    void writesValidGlbHeaderForEmptyMesh() {
        byte[] glb = GltfWriter.writeGlb(new TerrainMesh(empty("opaque"), empty("water"), empty("detail")));

        assertEquals("glTF", new String(glb, 0, 4, StandardCharsets.US_ASCII));
        assertEquals(2, leInt(glb, 4));                 // version
        assertEquals(glb.length, leInt(glb, 8));        // total length matches buffer
    }

    @Test
    void firstChunkIsJsonAndParsesAsGltf() {
        byte[] glb = GltfWriter.writeGlb(triangleMesh());

        int jsonLen = leInt(glb, 12);
        assertEquals("JSON", new String(glb, 16, 4, StandardCharsets.US_ASCII));
        String json = new String(glb, 20, jsonLen, StandardCharsets.UTF_8).trim();
        assertTrue(json.startsWith("{") && json.contains("\"asset\""),
                () -> "expected glTF JSON, got: " + json);
    }

    @Test
    void meshWithGeometryProducesABinChunk() {
        byte[] empty = GltfWriter.writeGlb(new TerrainMesh(empty("opaque"), empty("water"), empty("detail")));
        byte[] withTriangle = GltfWriter.writeGlb(triangleMesh());

        // Geometry adds a BIN chunk + accessors, so the file must be larger.
        assertTrue(withTriangle.length > empty.length);
        assertEquals(withTriangle.length, leInt(withTriangle, 8));
    }
}
