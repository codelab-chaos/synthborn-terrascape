package com.codelabchaos.terrascape.terrain;

import javax.annotation.Nonnull;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
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
        List<PartLayout> layouts = new ArrayList<>();
        addPart(binary, layouts, mesh.opaque(), 0);
        addPart(binary, layouts, mesh.water(), 1);
        addPart(binary, layouts, mesh.detail(), 2);
        byte[] bin = binary.toByteArray();

        Bounds bounds = Bounds.fromLayouts(layouts);
        String json = gltfJson(bin.length, layouts, bounds);
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

    private static void addPart(Binary binary, List<PartLayout> layouts, TerrainMesh.TerrainPart part, int materialIndex) {
        if (part.empty()) {
            return;
        }
        int positionOffset = binary.writeFloats(part.positions());
        int colorOffset = binary.writeFloats(part.colors());
        boolean shortIndices = part.vertexCount() <= 65535;
        int indexOffset = shortIndices
                ? binary.writeUnsignedShorts(part.indices())
                : binary.writeInts(part.indices());
        layouts.add(new PartLayout(part, materialIndex, positionOffset, colorOffset, indexOffset, shortIndices));
    }

    private static String gltfJson(int binLength, List<PartLayout> layouts, Bounds bounds) {
        StringBuilder bufferViews = new StringBuilder();
        StringBuilder accessors = new StringBuilder();
        StringBuilder primitives = new StringBuilder();
        int bufferView = 0;
        int accessor = 0;

        for (PartLayout layout : layouts) {
            int positionView = bufferView++;
            int colorView = bufferView++;
            int indexView = bufferView++;
            int indexComponentBytes = layout.shortIndices() ? Short.BYTES : Integer.BYTES;
            appendBufferView(bufferViews, positionView, layout.positionOffset(), layout.part().positions().length * Float.BYTES, 34962);
            appendBufferView(bufferViews, colorView, layout.colorOffset(), layout.part().colors().length * Float.BYTES, 34962);
            appendBufferView(bufferViews, indexView, layout.indexOffset(), layout.part().indices().length * indexComponentBytes, 34963);

            Bounds partBounds = Bounds.fromPositions(layout.part().positions());
            int positionAccessor = accessor++;
            int colorAccessor = accessor++;
            int indexAccessor = accessor++;
            appendPositionAccessor(accessors, positionAccessor, positionView, layout.part().vertexCount(), partBounds);
            appendVec3Accessor(accessors, colorAccessor, colorView, layout.part().vertexCount());
            appendIndexAccessor(accessors, indexAccessor, indexView, layout.part().indices().length,
                    layout.shortIndices() ? 5123 : 5125);

            if (!primitives.isEmpty()) {
                primitives.append(',');
            }
            primitives.append("{\"attributes\":{\"POSITION\":")
                    .append(positionAccessor)
                    .append(",\"COLOR_0\":")
                    .append(colorAccessor)
                    .append("},\"indices\":")
                    .append(indexAccessor)
                    .append(",\"material\":")
                    .append(layout.materialIndex())
                    .append("}");
        }

        return """
                {"asset":{"version":"2.0","generator":"Terrascape"},"scene":0,"scenes":[{"nodes":[0]}],"nodes":[{"name":"terrascape-terrain","mesh":0}],"meshes":[{"name":"terrascape-terrain","primitives":[%s]}],"materials":[{"name":"terrascape-opaque","doubleSided":true,"pbrMetallicRoughness":{"baseColorFactor":[1,1,1,1],"metallicFactor":0,"roughnessFactor":1}},{"name":"terrascape-water","doubleSided":true,"alphaMode":"BLEND","pbrMetallicRoughness":{"baseColorFactor":[0.78,0.96,1,0.86],"metallicFactor":0,"roughnessFactor":0.42}},{"name":"terrascape-detail","doubleSided":true,"pbrMetallicRoughness":{"baseColorFactor":[1,1,1,1],"metallicFactor":0,"roughnessFactor":0.95}}],"buffers":[{"byteLength":%d}],"bufferViews":[%s],"accessors":[%s]}
                """.formatted(
                primitives,
                binLength,
                bufferViews,
                accessors).trim();
    }

    private static void appendBufferView(StringBuilder json, int index, int offset, int length, int target) {
        appendComma(json, index);
        json.append("{\"buffer\":0,\"byteOffset\":").append(offset)
                .append(",\"byteLength\":").append(length)
                .append(",\"target\":").append(target)
                .append("}");
    }

    private static void appendPositionAccessor(StringBuilder json, int index, int bufferView, int count, Bounds bounds) {
        appendComma(json, index);
        json.append("{\"bufferView\":").append(bufferView)
                .append(",\"componentType\":5126,\"count\":").append(count)
                .append(",\"type\":\"VEC3\",\"min\":[")
                .append(f(bounds.minX)).append(',').append(f(bounds.minY)).append(',').append(f(bounds.minZ))
                .append("],\"max\":[")
                .append(f(bounds.maxX)).append(',').append(f(bounds.maxY)).append(',').append(f(bounds.maxZ))
                .append("]}");
    }

    private static void appendVec3Accessor(StringBuilder json, int index, int bufferView, int count) {
        appendComma(json, index);
        json.append("{\"bufferView\":").append(bufferView)
                .append(",\"componentType\":5126,\"count\":").append(count)
                .append(",\"type\":\"VEC3\"}");
    }

    private static void appendIndexAccessor(StringBuilder json, int index, int bufferView, int count, int componentType) {
        appendComma(json, index);
        json.append("{\"bufferView\":").append(bufferView)
                .append(",\"componentType\":").append(componentType)
                .append(",\"count\":").append(count)
                .append(",\"type\":\"SCALAR\"}");
    }

    private static void appendComma(StringBuilder json, int index) {
        if (index > 0) {
            json.append(',');
        }
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

    private record PartLayout(
            TerrainMesh.TerrainPart part,
            int materialIndex,
            int positionOffset,
            int colorOffset,
            int indexOffset,
            boolean shortIndices
    ) {
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

        int writeUnsignedShorts(int[] values) {
            align();
            int offset = out.size();
            ByteBuffer buffer = ByteBuffer.allocate(values.length * Short.BYTES).order(ByteOrder.LITTLE_ENDIAN);
            for (int value : values) {
                buffer.putShort((short) value);
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
        static Bounds fromLayouts(List<PartLayout> layouts) {
            if (layouts.isEmpty()) {
                return new Bounds(0, 0, 0, 0, 0, 0);
            }
            Bounds out = null;
            for (PartLayout layout : layouts) {
                out = merge(out, fromPositions(layout.part().positions()));
            }
            return out;
        }

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

        private static Bounds merge(Bounds a, Bounds b) {
            if (a == null) {
                return b;
            }
            return new Bounds(
                    Math.min(a.minX, b.minX),
                    Math.min(a.minY, b.minY),
                    Math.min(a.minZ, b.minZ),
                    Math.max(a.maxX, b.maxX),
                    Math.max(a.maxY, b.maxY),
                    Math.max(a.maxZ, b.maxZ));
        }
    }
}
