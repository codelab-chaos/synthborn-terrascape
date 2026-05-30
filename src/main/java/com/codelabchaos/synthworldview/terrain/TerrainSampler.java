package com.codelabchaos.synthworldview.terrain;

import com.hypixel.hytale.math.util.ChunkUtil;
import com.hypixel.hytale.protocol.Color;
import com.hypixel.hytale.server.core.asset.type.blocktype.config.BlockType;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.chunk.WorldChunk;

import javax.annotation.Nonnull;
import java.util.Locale;

public final class TerrainSampler {
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
        int nonEmpty = 0;
        int minY = Integer.MAX_VALUE;
        int maxY = Integer.MIN_VALUE;

        for (int z = 0; z < TerrainSnapshot.CHUNK_SIZE; z++) {
            for (int x = 0; x < TerrainSnapshot.CHUNK_SIZE; x++) {
                short height = chunk.getHeight(x, z);
                TerrainColumn column = sampleColumn(chunk, x, z, height);
                columns[z * TerrainSnapshot.CHUNK_SIZE + x] = column;
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

        return new TerrainSnapshot(world.getName(), chunkX, chunkZ, columns, nonEmpty, minY, maxY);
    }

    private static TerrainColumn sampleColumn(@Nonnull WorldChunk chunk, int localX, int localZ, short height) {
        if (height < 0) {
            return new TerrainColumn(localX, localZ, -1, 0, "EMPTY", 0x000000);
        }

        int blockId = chunk.getBlock(localX, height, localZ);
        BlockType blockType = BlockType.getAssetMap().getAsset(blockId);
        if (blockType == null || blockId == BlockType.EMPTY_ID) {
            return new TerrainColumn(localX, localZ, height, blockId, "EMPTY", 0x000000);
        }

        String blockKey = blockType.getId();
        int color = colorFor(blockType, blockKey, chunk.getTint(localX, localZ));
        return new TerrainColumn(localX, localZ, height, blockId, blockKey, color);
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
}
