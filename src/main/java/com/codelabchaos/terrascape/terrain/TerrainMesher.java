package com.codelabchaos.terrascape.terrain;

import javax.annotation.Nonnull;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class TerrainMesher {
    private static final float AO_STEP = 0.09f;
    private static final float AO_MIN = 0.70f;

    private TerrainMesher() {
    }

    public static TerrainMesh mesh(@Nonnull TerrainSnapshot snapshot) {
        return mesh(snapshot, true);
    }

    public static TerrainMesh mesh(@Nonnull TerrainSnapshot snapshot, boolean includeDetail) {
        MeshBuilder opaque = new MeshBuilder("opaque");
        MeshBuilder water = new MeshBuilder("water");
        MeshBuilder detail = new MeshBuilder("detail");
        for (TerrainColumn column : snapshot.columns()) {
            if (column == null || column.empty()) {
                continue;
            }
            MeshBuilder builder = column.fluid() ? water : opaque;
            addTop(builder, snapshot, column);
            addSideIfLower(builder, snapshot, column, 0, -1);
            addSideIfLower(builder, snapshot, column, 0, 1);
            addSideIfLower(builder, snapshot, column, -1, 0);
            addSideIfLower(builder, snapshot, column, 1, 0);
        }
        if (includeDetail) {
            addDetails(detail, snapshot, snapshot.details(),
                    TerrainDetail.Kind.CANOPY_VOXEL,
                    TerrainDetail.Kind.COSMETIC_VOXEL,
                    TerrainDetail.Kind.COSMETIC_THIN,
                    TerrainDetail.Kind.COSMETIC_LIGHT,
                    TerrainDetail.Kind.FOLIAGE_SMALL);
        }
        return new TerrainMesh(opaque.toPart(), water.toPart(), detail.toPart());
    }

    public static TerrainMesh cosmeticMesh(@Nonnull TerrainSnapshot snapshot) {
        MeshBuilder opaque = new MeshBuilder("opaque");
        MeshBuilder water = new MeshBuilder("water");
        MeshBuilder detail = new MeshBuilder("detail");
        addDetails(detail, snapshot, snapshot.details(),
                TerrainDetail.Kind.COSMETIC_VOXEL,
                TerrainDetail.Kind.COSMETIC_THIN,
                TerrainDetail.Kind.COSMETIC_LIGHT,
                TerrainDetail.Kind.FOLIAGE_SMALL);
        return new TerrainMesh(opaque.toPart(), water.toPart(), detail.toPart());
    }

    private static void addDetails(MeshBuilder builder, TerrainSnapshot snapshot, TerrainDetail[] details, TerrainDetail.Kind... includedKinds) {
        Map<DetailKey, TerrainDetail> canopy = new HashMap<>();
        for (TerrainDetail detail : details) {
            if (includesKind(detail.kind(), includedKinds)) {
                canopy.put(new DetailKey(detail.localX(), detail.y(), detail.localZ()), detail);
            }
        }
        for (TerrainDetail detail : canopy.values()) {
            addExposedDetail(builder, snapshot, detail, canopy);
        }
    }

    private static boolean includesKind(TerrainDetail.Kind kind, TerrainDetail.Kind[] includedKinds) {
        for (TerrainDetail.Kind includedKind : includedKinds) {
            if (kind == includedKind) {
                return true;
            }
        }
        return false;
    }

    private static void addExposedDetail(MeshBuilder builder, TerrainSnapshot snapshot, TerrainDetail detail, Map<DetailKey, TerrainDetail> canopy) {
        int x = detail.localX();
        int y = detail.y();
        int z = detail.localZ();
        DetailBoundsOriented.DetailBounds oriented = DetailBoundsOriented.bounds(detail.shape(), detail.rotationIndex());
        DetailBounds bounds = new DetailBounds(
                oriented.minX(),
                oriented.minY(),
                oriented.minZ(),
                oriented.maxX(),
                oriented.maxY(),
                oriented.maxZ());
        float x0 = x + bounds.minX();
        float x1 = x + bounds.maxX();
        float y0 = y + bounds.minY();
        float y1 = y + bounds.maxY();
        float z0 = z + bounds.minZ();
        float z1 = z + bounds.maxZ();
        int rgb = detail.rgb();

        if (!hasDetail(canopy, x, y + 1, z)) {
            builder.addQuadShaded(x0, y1, z0, x0, y1, z1, x1, y1, z1, x1, y1, z0, 0, 1, 0, rgb,
                    detailTopAo(snapshot, canopy, x, y, z, -1, -1) * 1.06f,
                    detailTopAo(snapshot, canopy, x, y, z, -1, 1) * 1.06f,
                    detailTopAo(snapshot, canopy, x, y, z, 1, 1) * 1.06f,
                    detailTopAo(snapshot, canopy, x, y, z, 1, -1) * 1.06f);
        }
        if (!hasDetail(canopy, x, y - 1, z)) {
            builder.addQuadShaded(x0, y0, z1, x0, y0, z0, x1, y0, z0, x1, y0, z1, 0, -1, 0, rgb,
                    detailBottomAo(snapshot, canopy, x, y, z, -1, 1) * 0.48f,
                    detailBottomAo(snapshot, canopy, x, y, z, -1, -1) * 0.48f,
                    detailBottomAo(snapshot, canopy, x, y, z, 1, -1) * 0.48f,
                    detailBottomAo(snapshot, canopy, x, y, z, 1, 1) * 0.48f);
        }
        if (!hasDetail(canopy, x + 1, y, z)) {
            builder.addQuadShaded(x1, y0, z1, x1, y1, z1, x1, y1, z0, x1, y0, z0, 1, 0, 0, rgb,
                    detailSideAo(snapshot, canopy, x, y, z, 1, 0, -1, 1) * 0.76f,
                    detailSideAo(snapshot, canopy, x, y, z, 1, 0, 1, 1) * 0.76f,
                    detailSideAo(snapshot, canopy, x, y, z, 1, 0, 1, -1) * 0.76f,
                    detailSideAo(snapshot, canopy, x, y, z, 1, 0, -1, -1) * 0.76f);
        }
        if (!hasDetail(canopy, x - 1, y, z)) {
            builder.addQuadShaded(x0, y0, z0, x0, y1, z0, x0, y1, z1, x0, y0, z1, -1, 0, 0, rgb,
                    detailSideAo(snapshot, canopy, x, y, z, -1, 0, -1, -1) * 0.68f,
                    detailSideAo(snapshot, canopy, x, y, z, -1, 0, 1, -1) * 0.68f,
                    detailSideAo(snapshot, canopy, x, y, z, -1, 0, 1, 1) * 0.68f,
                    detailSideAo(snapshot, canopy, x, y, z, -1, 0, -1, 1) * 0.68f);
        }
        if (!hasDetail(canopy, x, y, z + 1)) {
            builder.addQuadShaded(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1, 0, 0, 1, rgb,
                    detailSideAo(snapshot, canopy, x, y, z, 0, 1, -1, -1) * 0.72f,
                    detailSideAo(snapshot, canopy, x, y, z, 0, 1, -1, 1) * 0.72f,
                    detailSideAo(snapshot, canopy, x, y, z, 0, 1, 1, 1) * 0.72f,
                    detailSideAo(snapshot, canopy, x, y, z, 0, 1, 1, -1) * 0.72f);
        }
        if (!hasDetail(canopy, x, y, z - 1)) {
            builder.addQuadShaded(x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0, 0, 0, -1, rgb,
                    detailSideAo(snapshot, canopy, x, y, z, 0, -1, -1, 1) * 0.62f,
                    detailSideAo(snapshot, canopy, x, y, z, 0, -1, -1, -1) * 0.62f,
                    detailSideAo(snapshot, canopy, x, y, z, 0, -1, 1, -1) * 0.62f,
                    detailSideAo(snapshot, canopy, x, y, z, 0, -1, 1, 1) * 0.62f);
        }
    }

    private static boolean hasDetail(Map<DetailKey, TerrainDetail> canopy, int x, int y, int z) {
        return canopy.containsKey(new DetailKey(x, y, z));
    }

    private static void addTop(MeshBuilder builder, TerrainSnapshot snapshot, TerrainColumn column) {
        float x0 = column.localX();
        float x1 = column.localX() + 1.0f;
        float z0 = column.localZ();
        float z1 = column.localZ() + 1.0f;
        float y = column.y() + 1.0f;
        builder.addQuadShaded(
                x0, y, z0,
                x0, y, z1,
                x1, y, z1,
                x1, y, z0,
                0.0f, 1.0f, 0.0f,
                column.rgb(),
                topCornerShade(snapshot, column, -1, -1) * terrainTopAo(snapshot, column, -1, -1),
                topCornerShade(snapshot, column, -1, 1) * terrainTopAo(snapshot, column, -1, 1),
                topCornerShade(snapshot, column, 1, 1) * terrainTopAo(snapshot, column, 1, 1),
                topCornerShade(snapshot, column, 1, -1) * terrainTopAo(snapshot, column, 1, -1));
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
            builder.addQuadShaded(x1, y0, z1, x1, y1, z1, x1, y1, z0, x1, y0, z0, 1, 0, 0, column.rgb(),
                    terrainSideAo(snapshot, column, neighborY, 1, 0, -1, 1) * 0.74f,
                    terrainSideAo(snapshot, column, neighborY, 1, 0, 1, 1) * 0.74f,
                    terrainSideAo(snapshot, column, neighborY, 1, 0, 1, -1) * 0.74f,
                    terrainSideAo(snapshot, column, neighborY, 1, 0, -1, -1) * 0.74f);
        } else if (dx == -1) {
            builder.addQuadShaded(x0, y0, z0, x0, y1, z0, x0, y1, z1, x0, y0, z1, -1, 0, 0, column.rgb(),
                    terrainSideAo(snapshot, column, neighborY, -1, 0, -1, -1) * 0.66f,
                    terrainSideAo(snapshot, column, neighborY, -1, 0, 1, -1) * 0.66f,
                    terrainSideAo(snapshot, column, neighborY, -1, 0, 1, 1) * 0.66f,
                    terrainSideAo(snapshot, column, neighborY, -1, 0, -1, 1) * 0.66f);
        } else if (dz == 1) {
            builder.addQuadShaded(x0, y0, z1, x0, y1, z1, x1, y1, z1, x1, y0, z1, 0, 0, 1, column.rgb(),
                    terrainSideAo(snapshot, column, neighborY, 0, 1, -1, -1) * 0.70f,
                    terrainSideAo(snapshot, column, neighborY, 0, 1, 1, -1) * 0.70f,
                    terrainSideAo(snapshot, column, neighborY, 0, 1, 1, 1) * 0.70f,
                    terrainSideAo(snapshot, column, neighborY, 0, 1, -1, 1) * 0.70f);
        } else if (dz == -1) {
            builder.addQuadShaded(x1, y0, z0, x1, y1, z0, x0, y1, z0, x0, y0, z0, 0, 0, -1, column.rgb(),
                    terrainSideAo(snapshot, column, neighborY, 0, -1, -1, 1) * 0.60f,
                    terrainSideAo(snapshot, column, neighborY, 0, -1, 1, 1) * 0.60f,
                    terrainSideAo(snapshot, column, neighborY, 0, -1, 1, -1) * 0.60f,
                    terrainSideAo(snapshot, column, neighborY, 0, -1, -1, -1) * 0.60f);
        }
    }

    private static float terrainTopAo(TerrainSnapshot snapshot, TerrainColumn column, int sx, int sz) {
        int x = column.localX();
        int z = column.localZ();
        int y = column.y() + 1;
        return voxelAo(
                solidColumnAt(snapshot, x + sx, z, y),
                solidColumnAt(snapshot, x, z + sz, y),
                solidColumnAt(snapshot, x + sx, z + sz, y));
    }

    private static float terrainSideAo(
            TerrainSnapshot snapshot,
            TerrainColumn column,
            int neighborY,
            int dx,
            int dz,
            int sy,
            int lateral
    ) {
        int y = sy > 0 ? column.y() + 1 : neighborY;
        int edgeY = sy > 0 ? column.y() : neighborY;
        if (dx != 0) {
            int outsideX = column.localX() + dx;
            int sideZ = column.localZ() + lateral;
            return voxelAo(
                    solidColumnAt(snapshot, outsideX, column.localZ(), y),
                    solidColumnAt(snapshot, outsideX, sideZ, edgeY),
                    solidColumnAt(snapshot, outsideX, sideZ, y));
        }
        int outsideZ = column.localZ() + dz;
        int sideX = column.localX() + lateral;
        return voxelAo(
                solidColumnAt(snapshot, column.localX(), outsideZ, y),
                solidColumnAt(snapshot, sideX, outsideZ, edgeY),
                solidColumnAt(snapshot, sideX, outsideZ, y));
    }

    private static float detailTopAo(TerrainSnapshot snapshot, Map<DetailKey, TerrainDetail> details, int x, int y, int z, int sx, int sz) {
        int sampleY = y + 1;
        return voxelAo(
                solidDetailOrColumnAt(snapshot, details, x + sx, sampleY, z),
                solidDetailOrColumnAt(snapshot, details, x, sampleY, z + sz),
                solidDetailOrColumnAt(snapshot, details, x + sx, sampleY, z + sz));
    }

    private static float detailBottomAo(TerrainSnapshot snapshot, Map<DetailKey, TerrainDetail> details, int x, int y, int z, int sx, int sz) {
        int sampleY = y - 1;
        return voxelAo(
                solidDetailOrColumnAt(snapshot, details, x + sx, sampleY, z),
                solidDetailOrColumnAt(snapshot, details, x, sampleY, z + sz),
                solidDetailOrColumnAt(snapshot, details, x + sx, sampleY, z + sz));
    }

    private static float detailSideAo(
            TerrainSnapshot snapshot,
            Map<DetailKey, TerrainDetail> details,
            int x,
            int y,
            int z,
            int dx,
            int dz,
            int sy,
            int lateral
    ) {
        int sampleY = sy > 0 ? y + 1 : y - 1;
        if (dx != 0) {
            int outsideX = x + dx;
            int sideZ = z + lateral;
            return voxelAo(
                    solidDetailOrColumnAt(snapshot, details, outsideX, sampleY, z),
                    solidDetailOrColumnAt(snapshot, details, outsideX, y, sideZ),
                    solidDetailOrColumnAt(snapshot, details, outsideX, sampleY, sideZ));
        }
        int outsideZ = z + dz;
        int sideX = x + lateral;
        return voxelAo(
                solidDetailOrColumnAt(snapshot, details, x, sampleY, outsideZ),
                solidDetailOrColumnAt(snapshot, details, sideX, y, outsideZ),
                solidDetailOrColumnAt(snapshot, details, sideX, sampleY, outsideZ));
    }

    private static float voxelAo(boolean sideA, boolean sideB, boolean corner) {
        int occluders = sideA && sideB ? 3 : (sideA ? 1 : 0) + (sideB ? 1 : 0) + (corner ? 1 : 0);
        return Math.max(AO_MIN, 1.0f - occluders * AO_STEP);
    }

    private static boolean solidDetailOrColumnAt(TerrainSnapshot snapshot, Map<DetailKey, TerrainDetail> details, int x, int y, int z) {
        return details.containsKey(new DetailKey(x, y, z)) || solidColumnAt(snapshot, x, z, y);
    }

    private static boolean solidColumnAt(TerrainSnapshot snapshot, int x, int z, int y) {
        TerrainColumn column = snapshot.column(x, z);
        return column != null && !column.empty() && column.y() >= y;
    }

    private static float topCornerShade(TerrainSnapshot snapshot, TerrainColumn column, int sx, int sz) {
        int x = column.localX();
        int z = column.localZ();
        int y = column.y();
        int sideX = columnHeight(snapshot, x + sx, z);
        int sideZ = columnHeight(snapshot, x, z + sz);
        int diagonal = columnHeight(snapshot, x + sx, z + sz);
        float occlusion = occlusionFor(sideX, y) + occlusionFor(sideZ, y) + occlusionFor(diagonal, y) * 0.72f;
        float ledgeLift = liftFor(sideX, y) + liftFor(sideZ, y);
        return clamp(1.08f + ledgeLift - occlusion, 0.72f, 1.14f);
    }

    private static int columnHeight(TerrainSnapshot snapshot, int x, int z) {
        TerrainColumn column = snapshot.column(x, z);
        return column == null || column.empty() ? snapshot.minY() - 1 : column.y();
    }

    private static float occlusionFor(int neighborY, int y) {
        if (neighborY > y) return 0.24f;
        if (neighborY == y) return 0.05f;
        return 0.0f;
    }

    private static float liftFor(int neighborY, int y) {
        if (neighborY >= y) return 0.0f;
        return Math.min(0.035f, (y - neighborY) * 0.008f);
    }

    private static float clamp(float value, float min, float max) {
        return Math.max(min, Math.min(max, value));
    }

    private record DetailKey(int x, int y, int z) {
    }

    private record DetailBounds(float minX, float minY, float minZ, float maxX, float maxY, float maxZ) {
    }

    private static final class MeshBuilder {
        private final String name;
        private final List<Float> positions = new ArrayList<>();
        private final List<Float> normals = new ArrayList<>();
        private final List<Float> colors = new ArrayList<>();
        private final List<Integer> indices = new ArrayList<>();
        private int vertexCount;

        MeshBuilder(String name) {
            this.name = name;
        }

        void addQuad(
                float ax, float ay, float az,
                float bx, float by, float bz,
                float cx, float cy, float cz,
                float dx, float dy, float dz,
                float nx, float ny, float nz,
                int rgb
        ) {
            addQuadShaded(
                    ax, ay, az,
                    bx, by, bz,
                    cx, cy, cz,
                    dx, dy, dz,
                    nx, ny, nz,
                    rgb,
                    1.0f, 1.0f, 1.0f, 1.0f);
        }

        void addQuadShaded(
                float ax, float ay, float az,
                float bx, float by, float bz,
                float cx, float cy, float cz,
                float dx, float dy, float dz,
                float nx, float ny, float nz,
                int rgb,
                float shadeA,
                float shadeB,
                float shadeC,
                float shadeD
        ) {
            int base = vertexCount;
            addVertex(ax, ay, az, nx, ny, nz, rgb, shadeA);
            addVertex(bx, by, bz, nx, ny, nz, rgb, shadeB);
            addVertex(cx, cy, cz, nx, ny, nz, rgb, shadeC);
            addVertex(dx, dy, dz, nx, ny, nz, rgb, shadeD);
            if (shadeA + shadeC > shadeB + shadeD) {
                indices.add(base);
                indices.add(base + 1);
                indices.add(base + 3);
                indices.add(base + 1);
                indices.add(base + 2);
                indices.add(base + 3);
            } else {
                indices.add(base);
                indices.add(base + 1);
                indices.add(base + 2);
                indices.add(base);
                indices.add(base + 2);
                indices.add(base + 3);
            }
        }

        private void addVertex(float x, float y, float z, float nx, float ny, float nz, int rgb, float shade) {
            positions.add(x);
            positions.add(y);
            positions.add(z);
            normals.add(nx);
            normals.add(ny);
            normals.add(nz);
            colors.add(srgbToLinear(((rgb >>> 16) & 0xff) / 255.0f * shade));
            colors.add(srgbToLinear(((rgb >>> 8) & 0xff) / 255.0f * shade));
            colors.add(srgbToLinear((rgb & 0xff) / 255.0f * shade));
            vertexCount++;
        }

        private static float srgbToLinear(float value) {
            float clamped = Math.max(0.0f, Math.min(1.0f, value));
            if (clamped <= 0.04045f) {
                return clamped / 12.92f;
            }
            return (float) Math.pow((clamped + 0.055f) / 1.055f, 2.4f);
        }

        TerrainMesh.TerrainPart toPart() {
            return new TerrainMesh.TerrainPart(
                    name,
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
