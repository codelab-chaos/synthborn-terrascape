package com.codelabchaos.synthworldview.terrain;

import javax.annotation.Nonnull;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class TerrainMesher {
    private TerrainMesher() {
    }

    public static TerrainMesh mesh(@Nonnull TerrainSnapshot snapshot) {
        return mesh(snapshot, true);
    }

    public static TerrainMesh mesh(@Nonnull TerrainSnapshot snapshot, boolean includeDetail) {
        return mesh(snapshot, includeDetail, 0);
    }

    public static TerrainMesh mesh(@Nonnull TerrainSnapshot snapshot, boolean includeDetail, int lod) {
        if (lod > 0) {
            return meshLod(snapshot, lod);
        }

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
            addDetails(detail, snapshot.details());
        }
        return new TerrainMesh(opaque.toPart(), water.toPart(), detail.toPart());
    }

    private static TerrainMesh meshLod(@Nonnull TerrainSnapshot snapshot, int lod) {
        int cellSize = lodCellSize(lod);
        MeshBuilder opaque = new MeshBuilder("opaque-lod" + lod);
        MeshBuilder water = new MeshBuilder("water-lod" + lod);
        LodCell[][] cells = lodCells(snapshot, cellSize);

        for (int z = 0; z < cells.length; z++) {
            for (int x = 0; x < cells[z].length; x++) {
                LodCell cell = cells[z][x];
                if (cell.empty()) {
                    continue;
                }
                MeshBuilder builder = cell.fluid() ? water : opaque;
                addLodTop(builder, snapshot, cell);
                addLodSideIfLower(builder, snapshot, cells, cell, x, z, 0, -1);
                addLodSideIfLower(builder, snapshot, cells, cell, x, z, 0, 1);
                addLodSideIfLower(builder, snapshot, cells, cell, x, z, -1, 0);
                addLodSideIfLower(builder, snapshot, cells, cell, x, z, 1, 0);
            }
        }

        return new TerrainMesh(opaque.toPart(), water.toPart(), new MeshBuilder("detail-lod" + lod).toPart());
    }

    private static int lodCellSize(int lod) {
        return lod <= 1 ? 4 : Math.min(16, 4 << Math.min(2, lod - 1));
    }

    private static LodCell[][] lodCells(@Nonnull TerrainSnapshot snapshot, int cellSize) {
        int cellsPerAxis = TerrainSnapshot.CHUNK_SIZE / cellSize;
        LodCell[][] cells = new LodCell[cellsPerAxis][cellsPerAxis];
        for (int cellZ = 0; cellZ < cellsPerAxis; cellZ++) {
            for (int cellX = 0; cellX < cellsPerAxis; cellX++) {
                cells[cellZ][cellX] = sampleLodCell(snapshot, cellX * cellSize, cellZ * cellSize, cellSize);
            }
        }
        return cells;
    }

    private static LodCell sampleLodCell(@Nonnull TerrainSnapshot snapshot, int localX, int localZ, int size) {
        TerrainColumn bestSolid = null;
        TerrainColumn bestFluid = null;
        int solidCount = 0;
        int fluidCount = 0;
        long solidR = 0;
        long solidG = 0;
        long solidB = 0;
        long fluidR = 0;
        long fluidG = 0;
        long fluidB = 0;

        for (int z = localZ; z < localZ + size; z++) {
            for (int x = localX; x < localX + size; x++) {
                TerrainColumn column = snapshot.column(x, z);
                if (column == null || column.empty()) {
                    continue;
                }
                if (column.fluid()) {
                    fluidCount++;
                    fluidR += (column.rgb() >>> 16) & 0xff;
                    fluidG += (column.rgb() >>> 8) & 0xff;
                    fluidB += column.rgb() & 0xff;
                    if (bestFluid == null || column.y() > bestFluid.y()) {
                        bestFluid = column;
                    }
                } else {
                    solidCount++;
                    solidR += (column.rgb() >>> 16) & 0xff;
                    solidG += (column.rgb() >>> 8) & 0xff;
                    solidB += column.rgb() & 0xff;
                    if (bestSolid == null || column.y() > bestSolid.y()) {
                        bestSolid = column;
                    }
                }
            }
        }

        if (solidCount == 0 && fluidCount == 0) {
            return LodCell.empty(localX, localZ, size);
        }
        if (solidCount == 0 || fluidCount > solidCount * 2) {
            return new LodCell(localX, localZ, size, bestFluid.y(), averageRgb(fluidR, fluidG, fluidB, fluidCount), true, false);
        }
        return new LodCell(localX, localZ, size, bestSolid.y(), averageRgb(solidR, solidG, solidB, solidCount), false, false);
    }

    private static int averageRgb(long r, long g, long b, int count) {
        if (count <= 0) {
            return 0;
        }
        return ((int) (r / count) << 16) | ((int) (g / count) << 8) | (int) (b / count);
    }

    private static void addLodTop(MeshBuilder builder, TerrainSnapshot snapshot, LodCell cell) {
        float x0 = cell.localX();
        float x1 = cell.localX() + cell.size();
        float z0 = cell.localZ();
        float z1 = cell.localZ() + cell.size();
        float y = cell.y() + 1.0f;
        builder.addQuadShaded(
                x0, y, z0,
                x0, y, z1,
                x1, y, z1,
                x1, y, z0,
                0.0f, 1.0f, 0.0f,
                cell.rgb(),
                lodTopCornerShade(snapshot, cell, -1, -1),
                lodTopCornerShade(snapshot, cell, -1, 1),
                lodTopCornerShade(snapshot, cell, 1, 1),
                lodTopCornerShade(snapshot, cell, 1, -1));
    }

    private static void addLodSideIfLower(
            MeshBuilder builder,
            TerrainSnapshot snapshot,
            LodCell[][] cells,
            LodCell cell,
            int cellX,
            int cellZ,
            int dx,
            int dz
    ) {
        int neighborX = cellX + dx;
        int neighborZ = cellZ + dz;
        LodCell neighbor = neighborZ < 0 || neighborZ >= cells.length || neighborX < 0 || neighborX >= cells[neighborZ].length
                ? null
                : cells[neighborZ][neighborX];
        int neighborY = neighbor == null || neighbor.empty() ? snapshot.minY() - 1 : neighbor.y();
        if (neighborY >= cell.y()) {
            return;
        }

        float x0 = cell.localX();
        float x1 = cell.localX() + cell.size();
        float z0 = cell.localZ();
        float z1 = cell.localZ() + cell.size();
        float y0 = neighborY + 1.0f;
        float y1 = cell.y() + 1.0f;

        if (dx == 1) {
            builder.addQuad(x1, y0, z1, x1, y1, z1, x1, y1, z0, x1, y0, z0, 1, 0, 0, shade(cell.rgb(), 0.74f));
        } else if (dx == -1) {
            builder.addQuad(x0, y0, z0, x0, y1, z0, x0, y1, z1, x0, y0, z1, -1, 0, 0, shade(cell.rgb(), 0.66f));
        } else if (dz == 1) {
            builder.addQuad(x0, y0, z1, x0, y1, z1, x1, y1, z1, x1, y0, z1, 0, 0, 1, shade(cell.rgb(), 0.70f));
        } else if (dz == -1) {
            builder.addQuad(x1, y0, z0, x1, y1, z0, x0, y1, z0, x0, y0, z0, 0, 0, -1, shade(cell.rgb(), 0.60f));
        }
    }

    private static float lodTopCornerShade(TerrainSnapshot snapshot, LodCell cell, int sx, int sz) {
        int sampleX = clampInt(cell.localX() + (sx < 0 ? 0 : cell.size() - 1) + sx, 0, TerrainSnapshot.CHUNK_SIZE - 1);
        int sampleZ = clampInt(cell.localZ() + (sz < 0 ? 0 : cell.size() - 1) + sz, 0, TerrainSnapshot.CHUNK_SIZE - 1);
        TerrainColumn neighbor = snapshot.column(sampleX, sampleZ);
        int neighborY = neighbor == null || neighbor.empty() ? snapshot.minY() - 1 : neighbor.y();
        return clamp(1.06f + liftFor(neighborY, cell.y()) - occlusionFor(neighborY, cell.y()), 0.78f, 1.12f);
    }

    private static void addDetails(MeshBuilder builder, TerrainDetail[] details) {
        Map<DetailKey, TerrainDetail> canopy = new HashMap<>();
        for (TerrainDetail detail : details) {
            if (detail.kind() == TerrainDetail.Kind.CANOPY_VOXEL) {
                canopy.put(new DetailKey(detail.localX(), detail.y(), detail.localZ()), detail);
            }
        }
        for (TerrainDetail detail : canopy.values()) {
            addExposedDetail(builder, detail, canopy);
        }
    }

    private static void addExposedDetail(MeshBuilder builder, TerrainDetail detail, Map<DetailKey, TerrainDetail> canopy) {
        int x = detail.localX();
        int y = detail.y();
        int z = detail.localZ();
        float x0 = x;
        float x1 = x + 1.0f;
        float y0 = y;
        float y1 = y + 1.0f;
        float z0 = z;
        float z1 = z + 1.0f;
        int rgb = detail.rgb();

        if (!hasDetail(canopy, x, y + 1, z)) {
            builder.addQuad(x0, y1, z0, x0, y1, z1, x1, y1, z1, x1, y1, z0, 0, 1, 0, shade(rgb, 1.06f));
        }
        if (!hasDetail(canopy, x, y - 1, z)) {
            builder.addQuad(x0, y0, z1, x0, y0, z0, x1, y0, z0, x1, y0, z1, 0, -1, 0, shade(rgb, 0.48f));
        }
        if (!hasDetail(canopy, x + 1, y, z)) {
            builder.addQuad(x1, y0, z1, x1, y1, z1, x1, y1, z0, x1, y0, z0, 1, 0, 0, shade(rgb, 0.76f));
        }
        if (!hasDetail(canopy, x - 1, y, z)) {
            builder.addQuad(x0, y0, z0, x0, y1, z0, x0, y1, z1, x0, y0, z1, -1, 0, 0, shade(rgb, 0.68f));
        }
        if (!hasDetail(canopy, x, y, z + 1)) {
            builder.addQuad(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1, 0, 0, 1, shade(rgb, 0.72f));
        }
        if (!hasDetail(canopy, x, y, z - 1)) {
            builder.addQuad(x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0, 0, 0, -1, shade(rgb, 0.62f));
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
                topCornerShade(snapshot, column, -1, -1),
                topCornerShade(snapshot, column, -1, 1),
                topCornerShade(snapshot, column, 1, 1),
                topCornerShade(snapshot, column, 1, -1));
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
            builder.addQuad(x1, y0, z1, x1, y1, z1, x1, y1, z0, x1, y0, z0, 1, 0, 0, shade(column.rgb(), 0.74f));
        } else if (dx == -1) {
            builder.addQuad(x0, y0, z0, x0, y1, z0, x0, y1, z1, x0, y0, z1, -1, 0, 0, shade(column.rgb(), 0.66f));
        } else if (dz == 1) {
            builder.addQuad(x0, y0, z1, x0, y1, z1, x1, y1, z1, x1, y0, z1, 0, 0, 1, shade(column.rgb(), 0.70f));
        } else if (dz == -1) {
            builder.addQuad(x1, y0, z0, x1, y1, z0, x0, y1, z0, x0, y0, z0, 0, 0, -1, shade(column.rgb(), 0.60f));
        }
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

    private static int shade(int rgb, float factor) {
        int r = clampChannel(((rgb >>> 16) & 0xff) * factor);
        int g = clampChannel(((rgb >>> 8) & 0xff) * factor);
        int b = clampChannel((rgb & 0xff) * factor);
        return (r << 16) | (g << 8) | b;
    }

    private static int clampChannel(float value) {
        return Math.max(0, Math.min(255, Math.round(value)));
    }

    private static float clamp(float value, float min, float max) {
        return Math.max(min, Math.min(max, value));
    }

    private static int clampInt(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private record DetailKey(int x, int y, int z) {
    }

    private record LodCell(int localX, int localZ, int size, int y, int rgb, boolean fluid, boolean empty) {
        static LodCell empty(int localX, int localZ, int size) {
            return new LodCell(localX, localZ, size, -1, 0, false, true);
        }
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
            indices.add(base);
            indices.add(base + 1);
            indices.add(base + 2);
            indices.add(base);
            indices.add(base + 2);
            indices.add(base + 3);
        }

        private void addVertex(float x, float y, float z, float nx, float ny, float nz, int rgb, float shade) {
            positions.add(x);
            positions.add(y);
            positions.add(z);
            normals.add(nx);
            normals.add(ny);
            normals.add(nz);
            colors.add(Math.min(1.0f, ((rgb >>> 16) & 0xff) / 255.0f * shade));
            colors.add(Math.min(1.0f, ((rgb >>> 8) & 0xff) / 255.0f * shade));
            colors.add(Math.min(1.0f, (rgb & 0xff) / 255.0f * shade));
            vertexCount++;
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
