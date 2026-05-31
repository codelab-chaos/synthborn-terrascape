package com.codelabchaos.synthworldview.terrain;

import com.hypixel.hytale.math.util.ChunkUtil;
import com.hypixel.hytale.protocol.Color;
import com.hypixel.hytale.server.core.asset.type.blocktype.config.BlockType;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.chunk.WorldChunk;

import javax.annotation.Nonnull;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public final class TerrainSampler {
    private static final int SURFACE_FLUID_SCAN_ABOVE_HEIGHTMAP = 24;
    private static final int OVERLAND_SCAN_BELOW_HEIGHTMAP = 64;
    private static final int FLOATING_DETAIL_AIR_CHECK_DEPTH = 4;

    private TerrainSampler() {
    }

    public static TerrainSnapshot sample(@Nonnull World world, int chunkX, int chunkZ) {
        long chunkIndex = ChunkUtil.indexChunk(chunkX, chunkZ);
        WorldChunk chunk = world.getChunkIfLoaded(chunkIndex);
        if (chunk == null) {
            chunk = world.getNonTickingChunk(chunkIndex);
        }
        if (chunk == null) {
            throw new IllegalStateException("Chunk " + chunkX + "," + chunkZ + " is not available.");
        }

        TerrainColumn[] columns = new TerrainColumn[TerrainSnapshot.CHUNK_SIZE * TerrainSnapshot.CHUNK_SIZE];
        List<TerrainDetail> details = new ArrayList<>();
        int nonEmpty = 0;
        int minY = Integer.MAX_VALUE;
        int maxY = Integer.MIN_VALUE;

        for (int z = 0; z < TerrainSnapshot.CHUNK_SIZE; z++) {
            for (int x = 0; x < TerrainSnapshot.CHUNK_SIZE; x++) {
                short height = chunk.getHeight(x, z);
                SampledColumn sampled = sampleColumn(chunk, x, z, height);
                TerrainColumn column = sampled.column();
                columns[z * TerrainSnapshot.CHUNK_SIZE + x] = column;
                details.addAll(sampled.details());
                if (!column.empty()) {
                    nonEmpty++;
                    minY = Math.min(minY, column.y());
                    maxY = Math.max(maxY, column.y());
                }
            }
        }

        if (nonEmpty == 0) {
            minY = 0;
            maxY = 0;
        }

        return new TerrainSnapshot(world.getName(), chunkX, chunkZ, columns, details.toArray(TerrainDetail[]::new), nonEmpty, minY, maxY);
    }

    private static SampledColumn sampleColumn(@Nonnull WorldChunk chunk, int localX, int localZ, short height) {
        if (height < 0) {
            return new SampledColumn(new TerrainColumn(localX, localZ, -1, 0, 0, "EMPTY", 0x000000, false), List.of());
        }

        SurfaceFluid surfaceFluid = surfaceFluid(chunk, localX, localZ, height);
        if (surfaceFluid.present()) {
            return new SampledColumn(new TerrainColumn(
                    localX,
                    localZ,
                    surfaceFluid.y(),
                    0,
                    surfaceFluid.fluidId(),
                    "FLUID_" + surfaceFluid.fluidId(),
                    waterColor("water"),
                    true), List.of());
        }

        int blockId = safeBlockId(chunk, localX, height, localZ);
        int fluidId = safeFluidId(chunk, localX, height, localZ);
        BlockType blockType = BlockType.getAssetMap().getAsset(blockId);
        if (blockType == null || blockId == BlockType.EMPTY_ID) {
            return new SampledColumn(new TerrainColumn(localX, localZ, height, blockId, fluidId, "EMPTY", 0x000000, false), List.of());
        }

        String blockKey = blockType.getId();
        boolean fluid = fluidId != 0 || isFluidBlock(blockKey);
        int color = fluid ? waterColor(blockKey) : colorFor(blockType, blockKey, chunk.getTint(localX, localZ));
        if (!fluid && (isOverlandDetail(blockKey) || hasAirGapBelowTop(chunk, localX, localZ, height))) {
            return sampleOverlandColumn(chunk, localX, localZ, height, blockType, blockKey, color);
        }
        return new SampledColumn(new TerrainColumn(localX, localZ, height, blockId, fluidId, blockKey, color, fluid), List.of());
    }

    private static SampledColumn sampleOverlandColumn(
            @Nonnull WorldChunk chunk,
            int localX,
            int localZ,
            int height,
            BlockType topBlockType,
            String topBlockKey,
            int topColor
    ) {
        LeafScan leafScan = new LeafScan(height, List.of(), false);
        if (isFoliageBlock(topBlockKey) || hasAirGapBelowTop(chunk, localX, localZ, height)) {
            leafScan = collectOverlandUntilGround(chunk, localX, localZ, height, topColor);
        }

        int scanStartY = Math.min(height, leafScan.anchorY());
        TerrainColumn ground = null;
        for (int y = scanStartY; y >= Math.max(0, height - OVERLAND_SCAN_BELOW_HEIGHTMAP); y--) {
            int blockId = safeBlockId(chunk, localX, y, localZ);
            BlockType blockType = BlockType.getAssetMap().getAsset(blockId);
            if (blockType == null || blockId == BlockType.EMPTY_ID) {
                continue;
            }
            String blockKey = blockType.getId();
            if (!isOverlandDetail(blockKey) && !isFluidBlock(blockKey) && !isFloatingDetailBlock(chunk, localX, localZ, y)) {
                ground = new TerrainColumn(localX, localZ, y, blockId, safeFluidId(chunk, localX, y, localZ),
                        blockKey, colorFor(blockType, blockKey, chunk.getTint(localX, localZ)), false);
                break;
            }
        }

        List<TerrainDetail> details = leafScan.details();
        if (ground == null && !details.isEmpty()) {
            return new SampledColumn(new TerrainColumn(localX, localZ, -1, 0, 0, "EMPTY", 0x000000, false), details);
        }
        if (ground == null) {
            ground = new TerrainColumn(localX, localZ, height, safeBlockId(chunk, localX, height, localZ),
                    safeFluidId(chunk, localX, height, localZ), topBlockKey, topColor, false);
        }
        return new SampledColumn(ground, details);
    }

    private static LeafScan collectOverlandUntilGround(
            @Nonnull WorldChunk chunk,
            int localX,
            int localZ,
            int height,
            int fallbackColor
    ) {
        List<TerrainDetail> pending = new ArrayList<>();
        int bottomY = Math.max(0, height - OVERLAND_SCAN_BELOW_HEIGHTMAP);
        for (int y = height; y >= bottomY; y--) {
            int blockId = safeBlockId(chunk, localX, y, localZ);
            BlockType blockType = BlockType.getAssetMap().getAsset(blockId);
            if (blockType == null || blockId == BlockType.EMPTY_ID) {
                continue;
            }
            String blockKey = blockType.getId();
            if (isFoliageBlock(blockKey) || isTrunkBlock(blockKey)) {
                int color = colorFor(blockType, blockKey, chunk.getTint(localX, localZ));
                pending.add(new TerrainDetail(
                        localX,
                        localZ,
                        y,
                        TerrainDetail.Kind.CANOPY_VOXEL,
                        color == 0 ? fallbackColor : color));
                continue;
            }
            if (!isFluidBlock(blockKey)) {
                return new LeafScan(y, pending, true);
            }
        }
        return new LeafScan(bottomY - 1, pending, false);
    }

    private static boolean isFloatingDetailBlock(@Nonnull WorldChunk chunk, int localX, int localZ, int y) {
        int blockId = safeBlockId(chunk, localX, y, localZ);
        BlockType blockType = BlockType.getAssetMap().getAsset(blockId);
        if (blockType == null || blockId == BlockType.EMPTY_ID) {
            return false;
        }
        String blockKey = blockType.getId();
        return isOverlandDetail(blockKey) || hasAirGapBelowTop(chunk, localX, localZ, y);
    }

    private static boolean hasAirGapBelowTop(@Nonnull WorldChunk chunk, int localX, int localZ, int y) {
        for (int dy = 1; dy <= FLOATING_DETAIL_AIR_CHECK_DEPTH && y - dy >= 0; dy++) {
            if (safeBlockId(chunk, localX, y - dy, localZ) == BlockType.EMPTY_ID) {
                return true;
            }
        }
        return false;
    }

    private static SurfaceFluid surfaceFluid(@Nonnull WorldChunk chunk, int localX, int localZ, int height) {
        int topFluidY = -1;
        int topFluidId = 0;
        for (int dy = 0; dy <= SURFACE_FLUID_SCAN_ABOVE_HEIGHTMAP; dy++) {
            int y = height + dy;
            int fluidId = safeFluidId(chunk, localX, y, localZ);
            if (fluidId != 0) {
                topFluidY = y;
                topFluidId = fluidId;
            }
        }
        return new SurfaceFluid(topFluidY, topFluidId);
    }

    @SuppressWarnings("removal")
    private static int safeFluidId(@Nonnull WorldChunk chunk, int localX, int y, int localZ) {
        try {
            return chunk.getFluidId(localX, y, localZ);
        } catch (RuntimeException e) {
            return 0;
        }
    }

    private static int safeBlockId(@Nonnull WorldChunk chunk, int localX, int y, int localZ) {
        try {
            return chunk.getBlock(localX, y, localZ);
        } catch (RuntimeException e) {
            return BlockType.EMPTY_ID;
        }
    }

    private static int colorFor(BlockType blockType, String blockKey, int chunkTint) {
        int color = colorFromSdk(blockType);
        if (color < 0) {
            color = fallbackColor(blockKey);
        }

        if (usesBiomeTopTint(blockType)) {
            color = multiplyRgb(color, normalizeRgb(chunkTint));
        }

        return color;
    }

    private static int colorFromSdk(BlockType blockType) {
        Color computed = blockType.getTextureComputedColor();
        if (computed != null) {
            return toRgb(computed);
        }

        Color[] topTints = blockType.getTintUp();
        if (topTints != null && topTints.length > 0 && topTints[0] != null) {
            return toRgb(topTints[0]);
        }

        Color particle = blockType.getParticleColor();
        if (particle != null) {
            return toRgb(particle);
        }

        return -1;
    }

    private static boolean usesBiomeTopTint(BlockType blockType) {
        return blockType.getBiomeTintUp() != 0;
    }

    private static boolean isFluidBlock(String blockKey) {
        String key = blockKey == null ? "" : blockKey.toLowerCase(Locale.ROOT);
        return key.contains("water")
                || key.contains("river")
                || key.contains("ocean")
                || key.contains("lake");
    }

    private static boolean isOverlandDetail(String blockKey) {
        return isFoliageBlock(blockKey) || isTrunkBlock(blockKey);
    }

    private static boolean isFoliageBlock(String blockKey) {
        String key = blockKey == null ? "" : blockKey.toLowerCase(Locale.ROOT);
        return key.contains("leaf")
                || key.contains("leaves")
                || key.contains("foliage")
                || key.contains("bush");
    }

    private static boolean isTrunkBlock(String blockKey) {
        String key = blockKey == null ? "" : blockKey.toLowerCase(Locale.ROOT);
        return key.contains("trunk")
                || key.contains("log")
                || key.contains("wood");
    }

    private static int waterColor(String blockKey) {
        String key = blockKey == null ? "" : blockKey.toLowerCase(Locale.ROOT);
        if (key.contains("lava")) return 0xd85d23;
        if (key.contains("ice")) return 0x9fd7ed;
        return 0x2f83bd;
    }

    private static int toRgb(Color color) {
        return (Byte.toUnsignedInt(color.red) << 16)
                | (Byte.toUnsignedInt(color.green) << 8)
                | Byte.toUnsignedInt(color.blue);
    }

    private static int normalizeRgb(int rgb) {
        int value = rgb & 0x00ffffff;
        return value == 0 ? 0xffffff : value;
    }

    private static int multiplyRgb(int base, int tint) {
        int r = ((base >>> 16) & 0xff) * ((tint >>> 16) & 0xff) / 255;
        int g = ((base >>> 8) & 0xff) * ((tint >>> 8) & 0xff) / 255;
        int b = (base & 0xff) * (tint & 0xff) / 255;
        return (r << 16) | (g << 8) | b;
    }

    private static int fallbackColor(String blockKey) {
        String key = blockKey == null ? "" : blockKey.toLowerCase(Locale.ROOT);
        if (key.contains("grass")) return 0x5f9f45;
        if (key.contains("leaf") || key.contains("leaves") || key.contains("foliage")) return 0x3f7f3f;
        if (key.contains("dirt") || key.contains("soil") || key.contains("mud")) return 0x7b5a36;
        if (key.contains("sand")) return 0xc9b46a;
        if (key.contains("snow") || key.contains("ice")) return 0xd8eef0;
        if (key.contains("water")) return 0x3f7fbf;
        if (key.contains("wood") || key.contains("trunk") || key.contains("log")) return 0x8b5a2b;
        if (key.contains("stone") || key.contains("rock") || key.contains("ore")) return 0x858585;

        int hash = blockKey == null ? 0 : blockKey.hashCode();
        int r = 96 + ((hash >>> 16) & 0x5f);
        int g = 96 + ((hash >>> 8) & 0x5f);
        int b = 96 + (hash & 0x5f);
        return (r << 16) | (g << 8) | b;
    }

    private record SurfaceFluid(int y, int fluidId) {
        boolean present() {
            return y >= 0 && fluidId != 0;
        }
    }

    private record LeafScan(int anchorY, List<TerrainDetail> details, boolean anchored) {
    }

    private record SampledColumn(TerrainColumn column, List<TerrainDetail> details) {
    }
}
