package com.codelabchaos.synthworldview.terrain;

import javax.annotation.Nonnull;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

public final class GltfWriter {
    private static final int GLB_MAGIC = 0x46546c67;
    private static final int GLB_VERSION = 2;
    private static final int JSON_CHUNK_TYPE = 0x4e4f534a;
    private static final int BIN_CHUNK_TYPE = 0x004e4942;

    private GltfWriter() {
    }

    public static byte[] writeGlb(@Nonnull TerrainMesh mesh) {
        Binary binary = new Binary();
        int positionOffset = binary.writeFloats(mesh.positions());
        int normalOffset = binary.writeFloats(mesh.normals());
        int colorOffset = binary.writeFloats(mesh.colors());
        int indexOffset = binary.writeInts(mesh.indices());
        byte[] bin = binary.toByteArray();

        Bounds bounds = Bounds.fromPositions(mesh.positions());
        String json = gltfJson(mesh, bin.length, positionOffset, normalOffset, colorOffset, indexOffset, bounds);
        byte[] jsonBytes = pad(json.getBytes(StandardCharsets.UTF_8), (byte) 0x20);
        byte[] binBytes = pad(bin, (byte) 0x00);

        ByteBuffer out = ByteBuffer.allocate(12 + 8 + jsonBytes.length + 8 + binBytes.length)
                .order(ByteOrder.LITTLE_ENDIAN);
        out.putInt(GLB_MAGIC);
        out.putInt(GLB_VERSION);
        out.putInt(out.capacity());
        out.putInt(jsonBytes.length);
        out.putInt(JSON_CHUNK_TYPE);
        out.put(jsonBytes);
        out.putInt(binBytes.length);
        out.putInt(BIN_CHUNK_TYPE);
        out.put(binBytes);
        return out.array();
    }

    private static String gltfJson(
            TerrainMesh mesh,
            int binLength,
            int positionOffset,
            int normalOffset,
            int colorOffset,
            int indexOffset,
            Bounds bounds
    ) {
        int positionsLength = mesh.positions().length * Float.BYTES;
        int normalsLength = mesh.normals().length * Float.BYTES;
        int colorsLength = mesh.colors().length * Float.BYTES;
        int indicesLength = mesh.indices().length * Integer.BYTES;
        return """
                {"asset":{"version":"2.0","generator":"SynthWorldview"},"scene":0,"scenes":[{"nodes":[0]}],"nodes":[{"mesh":0}],"meshes":[{"primitives":[{"attributes":{"POSITION":0,"NORMAL":1,"COLOR_0":2},"indices":3,"material":0}]}],"materials":[{"doubleSided":true,"pbrMetallicRoughness":{"baseColorFactor":[1,1,1,1],"metallicFactor":0,"roughnessFactor":1}}],"buffers":[{"byteLength":%d}],"bufferViews":[{"buffer":0,"byteOffset":%d,"byteLength":%d,"target":34962},{"buffer":0,"byteOffset":%d,"byteLength":%d,"target":34962},{"buffer":0,"byteOffset":%d,"byteLength":%d,"target":34962},{"buffer":0,"byteOffset":%d,"byteLength":%d,"target":34963}],"accessors":[{"bufferView":0,"componentType":5126,"count":%d,"type":"VEC3","min":[%s,%s,%s],"max":[%s,%s,%s]},{"bufferView":1,"componentType":5126,"count":%d,"type":"VEC3"},{"bufferView":2,"componentType":5126,"count":%d,"type":"VEC3"},{"bufferView":3,"componentType":5125,"count":%d,"type":"SCALAR"}]}
                """.formatted(
                binLength,
                positionOffset, positionsLength,
                normalOffset, normalsLength,
                colorOffset, colorsLength,
                indexOffset, indicesLength,
                mesh.vertexCount(),
                f(bounds.minX), f(bounds.minY), f(bounds.minZ),
                f(bounds.maxX), f(bounds.maxY), f(bounds.maxZ),
                mesh.vertexCount(),
                mesh.vertexCount(),
                mesh.indices().length).trim();
    }

    private static String f(float value) {
        return String.format(Locale.ROOT, "%.4f", value);
    }

    private static byte[] pad(byte[] bytes, byte pad) {
        int paddedLength = align4(bytes.length);
        if (paddedLength == bytes.length) {
            return bytes;
        }
        byte[] out = java.util.Arrays.copyOf(bytes, paddedLength);
        java.util.Arrays.fill(out, bytes.length, out.length, pad);
        return out;
    }

    private static int align4(int value) {
        return (value + 3) & ~3;
    }

    private static final class Binary {
        private final ByteArrayOutputStream out = new ByteArrayOutputStream();

        int writeFloats(float[] values) {
            align();
            int offset = out.size();
            ByteBuffer buffer = ByteBuffer.allocate(values.length * Float.BYTES).order(ByteOrder.LITTLE_ENDIAN);
            for (float value : values) {
                buffer.putFloat(value);
            }
            out.writeBytes(buffer.array());
            return offset;
        }

        int writeInts(int[] values) {
            align();
            int offset = out.size();
            ByteBuffer buffer = ByteBuffer.allocate(values.length * Integer.BYTES).order(ByteOrder.LITTLE_ENDIAN);
            for (int value : values) {
                buffer.putInt(value);
            }
            out.writeBytes(buffer.array());
            return offset;
        }

        byte[] toByteArray() {
            align();
            return out.toByteArray();
        }

        private void align() {
            while ((out.size() % 4) != 0) {
                out.write(0);
            }
        }
    }

    private record Bounds(float minX, float minY, float minZ, float maxX, float maxY, float maxZ) {
        static Bounds fromPositions(float[] positions) {
            if (positions.length == 0) {
                return new Bounds(0, 0, 0, 0, 0, 0);
            }
            float minX = Float.MAX_VALUE;
            float minY = Float.MAX_VALUE;
            float minZ = Float.MAX_VALUE;
            float maxX = -Float.MAX_VALUE;
            float maxY = -Float.MAX_VALUE;
            float maxZ = -Float.MAX_VALUE;
            for (int i = 0; i < positions.length; i += 3) {
                float x = positions[i];
                float y = positions[i + 1];
                float z = positions[i + 2];
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                minZ = Math.min(minZ, z);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
                maxZ = Math.max(maxZ, z);
            }
            return new Bounds(minX, minY, minZ, maxX, maxY, maxZ);
        }
    }
}
