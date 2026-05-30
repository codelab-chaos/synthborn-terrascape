package com.codelabchaos.synthworldview.terrain;

import javax.annotation.Nonnull;
import java.util.ArrayList;
import java.util.List;

public final class TerrainMesher {
    private TerrainMesher() {
    }

    public static TerrainMesh mesh(@Nonnull TerrainSnapshot snapshot) {
        MeshBuilder builder = new MeshBuilder();
        for (TerrainColumn column : snapshot.columns()) {
            if (column == null || column.empty()) {
                continue;
            }
            addTop(builder, column);
            addSideIfLower(builder, snapshot, column, 0, -1);
            addSideIfLower(builder, snapshot, column, 0, 1);
            addSideIfLower(builder, snapshot, column, -1, 0);
            addSideIfLower(builder, snapshot, column, 1, 0);
        }
        return builder.toMesh();
    }

    private static void addTop(MeshBuilder builder, TerrainColumn column) {
        float x0 = column.localX();
        float x1 = column.localX() + 1.0f;
        float z0 = column.localZ();
        float z1 = column.localZ() + 1.0f;
        float y = column.y() + 1.0f;
        builder.addQuad(
                x0, y, z0,
                x0, y, z1,
                x1, y, z1,
                x1, y, z0,
                0.0f, 1.0f, 0.0f,
                column.rgb());
    }

    private static void addSideIfLower(MeshBuilder builder, TerrainSnapshot snapshot, TerrainColumn column, int dx, int dz) {
        TerrainColumn neighbor = snapshot.column(column.localX() + dx, column.localZ() + dz);
        int neighborY = neighbor == null || neighbor.empty() ? snapshot.minY() - 1 : neighbor.y();
        if (neighborY >= column.y()) {
            return;
        }

        float x0 = column.localX();
        float x1 = column.localX() + 1.0f;
        float z0 = column.localZ();
        float z1 = column.localZ() + 1.0f;
        float y0 = neighborY + 1.0f;
        float y1 = column.y() + 1.0f;

        if (dx == 1) {
            builder.addQuad(x1, y0, z1, x1, y1, z1, x1, y1, z0, x1, y0, z0, 1, 0, 0, darken(column.rgb()));
        } else if (dx == -1) {
            builder.addQuad(x0, y0, z0, x0, y1, z0, x0, y1, z1, x0, y0, z1, -1, 0, 0, darken(column.rgb()));
        } else if (dz == 1) {
            builder.addQuad(x0, y0, z1, x0, y1, z1, x1, y1, z1, x1, y0, z1, 0, 0, 1, darken(column.rgb()));
        } else if (dz == -1) {
            builder.addQuad(x1, y0, z0, x1, y1, z0, x0, y1, z0, x0, y0, z0, 0, 0, -1, darken(column.rgb()));
        }
    }

    private static int darken(int rgb) {
        int r = (int) (((rgb >>> 16) & 0xff) * 0.72f);
        int g = (int) (((rgb >>> 8) & 0xff) * 0.72f);
        int b = (int) ((rgb & 0xff) * 0.72f);
        return (r << 16) | (g << 8) | b;
    }

    private static final class MeshBuilder {
        private final List<Float> positions = new ArrayList<>();
        private final List<Float> normals = new ArrayList<>();
        private final List<Float> colors = new ArrayList<>();
        private final List<Integer> indices = new ArrayList<>();
        private int vertexCount;

        void addQuad(
                float ax, float ay, float az,
                float bx, float by, float bz,
                float cx, float cy, float cz,
                float dx, float dy, float dz,
                float nx, float ny, float nz,
                int rgb
        ) {
            int base = vertexCount;
            addVertex(ax, ay, az, nx, ny, nz, rgb);
            addVertex(bx, by, bz, nx, ny, nz, rgb);
            addVertex(cx, cy, cz, nx, ny, nz, rgb);
            addVertex(dx, dy, dz, nx, ny, nz, rgb);
            indices.add(base);
            indices.add(base + 1);
            indices.add(base + 2);
            indices.add(base);
            indices.add(base + 2);
            indices.add(base + 3);
        }

        private void addVertex(float x, float y, float z, float nx, float ny, float nz, int rgb) {
            positions.add(x);
            positions.add(y);
            positions.add(z);
            normals.add(nx);
            normals.add(ny);
            normals.add(nz);
            colors.add(((rgb >>> 16) & 0xff) / 255.0f);
            colors.add(((rgb >>> 8) & 0xff) / 255.0f);
            colors.add((rgb & 0xff) / 255.0f);
            vertexCount++;
        }

        TerrainMesh toMesh() {
            return new TerrainMesh(
                    toFloatArray(positions),
                    toFloatArray(normals),
                    toFloatArray(colors),
                    indices.stream().mapToInt(Integer::intValue).toArray(),
                    vertexCount,
                    indices.size() / 3);
        }

        private static float[] toFloatArray(List<Float> values) {
            float[] out = new float[values.size()];
            for (int i = 0; i < values.size(); i++) {
                out[i] = values.get(i);
            }
            return out;
        }
    }
}
