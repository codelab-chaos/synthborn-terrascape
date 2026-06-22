package com.codelabchaos.terrascape.terrain;

import org.junit.jupiter.api.Test;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GltfWriterExtraTest {

    private static final int GLB_MAGIC = 0x46546c67;
    private static final int JSON_CHUNK_TYPE = 0x4e4f534a;
    private static final int BIN_CHUNK_TYPE = 0x004e4942;

    private static TerrainMesh.TerrainPart emptyPart(String name) {
        return new TerrainMesh.TerrainPart(name, new float[0], new float[0], new int[0], 0, 0);
    }

    /** One axis-aligned quad: 4 vertices, 2 triangles. */
    private static TerrainMesh.TerrainPart quadPart(String name) {
        float[] positions = {
                0, 0, 0,
                1, 0, 0,
                1, 1, 0,
                0, 1, 0
        };
        float[] colors = {
                1, 0, 0,
                0, 1, 0,
                0, 0, 1,
                1, 1, 1
        };
        int[] indices = {0, 1, 2, 0, 2, 3};
        return new TerrainMesh.TerrainPart(name, positions, colors, indices, 4, 2);
    }

    private static String jsonChunk(byte[] glb) {
        ByteBuffer buffer = ByteBuffer.wrap(glb).order(ByteOrder.LITTLE_ENDIAN);
        buffer.position(12);
        int jsonLength = buffer.getInt();
        int type = buffer.getInt();
        assertEquals(JSON_CHUNK_TYPE, type);
        byte[] json = new byte[jsonLength];
        buffer.get(json);
        return new String(json, StandardCharsets.UTF_8);
    }

    @Test
    void emptyMeshProducesValidHeaderAndZeroLengthBuffer() {
        TerrainMesh mesh = new TerrainMesh(emptyPart("opaque"), emptyPart("water"), emptyPart("detail"));
        byte[] glb = GltfWriter.writeGlb(mesh);

        ByteBuffer buffer = ByteBuffer.wrap(glb).order(ByteOrder.LITTLE_ENDIAN);
        assertEquals(GLB_MAGIC, buffer.getInt());
        assertEquals(2, buffer.getInt());
        assertEquals(glb.length, buffer.getInt());

        String json = jsonChunk(glb);
        // No primitives when all parts empty.
        assertTrue(json.contains("\"primitives\":[]"));
        assertTrue(json.contains("\"byteLength\":0"));
        assertTrue(json.contains("\"bufferViews\":[]"));
        assertTrue(json.contains("\"accessors\":[]"));
    }

    @Test
    void singleQuadProducesPrimitiveBufferViewsAndAccessors() {
        TerrainMesh mesh = new TerrainMesh(quadPart("opaque"), emptyPart("water"), emptyPart("detail"));
        byte[] glb = GltfWriter.writeGlb(mesh);

        assertEquals(GLB_MAGIC, ByteBuffer.wrap(glb).order(ByteOrder.LITTLE_ENDIAN).getInt());

        String json = jsonChunk(glb);
        // One primitive referencing material 0 (opaque).
        assertTrue(json.contains("\"POSITION\":0"));
        assertTrue(json.contains("\"COLOR_0\":1"));
        assertTrue(json.contains("\"material\":0"));
        // Short indices => component type 5123.
        assertTrue(json.contains("\"componentType\":5123"));
        // Position accessor carries bounds derived from the quad.
        assertTrue(json.contains("\"min\":[0.0000,0.0000,0.0000]"));
        assertTrue(json.contains("\"max\":[1.0000,1.0000,0.0000]"));
        // Three buffer views (position, color, index) and three accessors.
        assertTrue(json.contains("34962"));
        assertTrue(json.contains("34963"));
    }

    @Test
    void multiplePartsEmitMultiplePrimitivesAndMaterials() {
        TerrainMesh mesh = new TerrainMesh(quadPart("opaque"), quadPart("water"), quadPart("detail"));
        byte[] glb = GltfWriter.writeGlb(mesh);
        String json = jsonChunk(glb);

        assertTrue(json.contains("\"material\":0"));
        assertTrue(json.contains("\"material\":1"));
        assertTrue(json.contains("\"material\":2"));
        // Three distinct primitives, one per material.
        long materialRefs = json.split("\"material\":", -1).length - 1;
        assertEquals(3, materialRefs);
    }

    @Test
    void largeVertexCountUsesIntIndices() {
        // vertexCount > 65535 forces 32-bit indices (writeInts + componentType 5125).
        int vertexCount = 70000;
        float[] positions = {0, 0, 0, 1, 0, 0, 1, 1, 0};
        float[] colors = {1, 1, 1, 1, 1, 1, 1, 1, 1};
        int[] indices = {0, 1, 2};
        TerrainMesh.TerrainPart big =
                new TerrainMesh.TerrainPart("opaque", positions, colors, indices, vertexCount, 1);
        TerrainMesh mesh = new TerrainMesh(big, emptyPart("water"), emptyPart("detail"));

        byte[] glb = GltfWriter.writeGlb(mesh);
        String json = jsonChunk(glb);
        assertTrue(json.contains("\"componentType\":5125"));
        assertFalse(json.contains("\"componentType\":5123"));
        assertTrue(json.contains("\"count\":70000"));
    }

    @Test
    void binChunkIsFourBytePaddedAndDeclaredLengthMatches() {
        TerrainMesh mesh = new TerrainMesh(quadPart("opaque"), emptyPart("water"), emptyPart("detail"));
        byte[] glb = GltfWriter.writeGlb(mesh);

        ByteBuffer buffer = ByteBuffer.wrap(glb).order(ByteOrder.LITTLE_ENDIAN);
        buffer.position(12);
        int jsonLength = buffer.getInt();
        buffer.getInt(); // json chunk type
        buffer.position(buffer.position() + jsonLength);
        int binLength = buffer.getInt();
        assertEquals(BIN_CHUNK_TYPE, buffer.getInt());
        assertEquals(0, binLength % 4);
        // Total file length is consistent: header(12) + jsonChunkHeader(8) + json + binChunkHeader(8) + bin.
        assertEquals(12 + 8 + jsonLength + 8 + binLength, glb.length);
    }

    @Test
    void realMesherOutputRoundTripsThroughWriter() {
        TerrainColumn[] columns = new TerrainColumn[TerrainSnapshot.CHUNK_SIZE * TerrainSnapshot.CHUNK_SIZE];
        columns[0] = new TerrainColumn(0, 0, 4, 1, 0, "stone", 0x808080, false);
        TerrainSnapshot snapshot = new TerrainSnapshot(
                "w", 0, 0, columns, new TerrainDetail[0], 1, 0, 8);
        TerrainMesh mesh = TerrainMesher.mesh(snapshot);

        byte[] glb = GltfWriter.writeGlb(mesh);
        assertEquals(GLB_MAGIC, ByteBuffer.wrap(glb).order(ByteOrder.LITTLE_ENDIAN).getInt());
        assertTrue(mesh.opaque().vertexCount() > 0);
    }
}
