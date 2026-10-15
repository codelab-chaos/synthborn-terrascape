package com.codelabchaos.terrascape.terrain;

import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.math.util.ChunkUtil;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.chunk.BlockChunk;
import com.hypixel.hytale.server.core.universe.world.chunk.heightmap.HeightmapColumn;
import com.hypixel.hytale.server.core.universe.world.chunk.section.BlockSection;
import com.hypixel.hytale.server.core.universe.world.chunk.section.FluidSection;
import com.hypixel.hytale.server.core.universe.world.storage.ChunkStore;
import com.hypixel.hytale.server.core.universe.world.storage.GetChunkFlags;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.IntBinaryOperator;
import java.util.function.IntFunction;

/** A world-thread-only view of a column and its section components for one snapshot. */
final class TerrainChunkReader {
    /** Height reported for a column with no heightmap or no solid block. */
    static final int NO_HEIGHT = -1;
    private static final long CHUNK_LOAD_TIMEOUT_MS = 30_000;

    private final BlockChunk column;
    private final IntBinaryOperator heightAt;
    private final IntFunction<Section> resolveSection;
    private final Map<Integer, Section> sections = new HashMap<>();

    TerrainChunkReader(BlockChunk column, IntBinaryOperator heightAt, IntFunction<Section> resolveSection) {
        this.column = column;
        this.heightAt = heightAt;
        this.resolveSection = resolveSection;
    }

    static TerrainChunkReader load(World world, int chunkX, int chunkZ) {
        ChunkStore chunks = world.getChunkStore();
        long index = ChunkUtil.indexChunk(chunkX, chunkZ);
        Ref<ChunkStore> ref = chunks.getChunkReference(index);
        if (ref == null || !ref.isValid()) {
            // Preserve on-demand non-ticking loads. Service world tasks while waiting;
            // a plain join on the world thread would deadlock.
            ref = awaitOnWorldThread(world, chunks.getChunkReferenceAsync(index, GetChunkFlags.NONE));
        }
        if (ref == null || !ref.isValid()) {
            throw new IllegalStateException("Chunk " + chunkX + "," + chunkZ + " is not available.");
        }
        BlockChunk column = chunks.getStore().getComponent(ref, BlockChunk.getComponentType());
        if (column == null) {
            throw new IllegalStateException("Chunk " + chunkX + "," + chunkZ + " has no block column.");
        }
        HeightmapColumn heightmap = chunks.getStore().getComponent(ref, HeightmapColumn.getComponentType());
        return new TerrainChunkReader(column, heightFunction(heightmap), sectionY -> {
            Ref<ChunkStore> section = chunks.getChunkSectionReference(chunkX, sectionY, chunkZ);
            if (section == null || !section.isValid()) return Section.EMPTY;
            return new Section(
                    chunks.getStore().getComponent(section, BlockSection.getComponentType()),
                    chunks.getStore().getComponent(section, FluidSection.getComponentType()));
        });
    }

    static IntBinaryOperator heightFunction(HeightmapColumn heightmap) {
        return (x, z) -> {
            if (heightmap == null) return NO_HEIGHT;
            int height = heightmap.getHeight(x, z);
            return height == HeightmapColumn.NO_HEIGHT ? NO_HEIGHT : height;
        };
    }

    private static <T> T awaitOnWorldThread(World world, CompletableFuture<T> future) {
        long deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(CHUNK_LOAD_TIMEOUT_MS);
        while (!future.isDone()) {
            if (System.nanoTime() > deadline) throw new IllegalStateException("Timed out loading chunk.");
            if (world.isInThread()) world.consumeTaskQueue();
            Thread.onSpinWait();
        }
        return future.join();
    }

    int getHeight(int x, int z) { return heightAt.applyAsInt(x, z); }
    int getTint(int x, int z) { return column.getTint(x, z); }

    int getBlock(int x, int y, int z) {
        BlockSection blocks = section(y).blocks();
        return blocks == null ? 0 : blocks.get(x, Math.floorMod(y, 32), z);
    }

    int getRotationIndex(int x, int y, int z) {
        BlockSection blocks = section(y).blocks();
        return blocks == null ? 0 : blocks.getRotationIndex(x, Math.floorMod(y, 32), z);
    }

    int getFluidId(int x, int y, int z) {
        FluidSection fluids = section(y).fluids();
        return fluids == null ? 0 : fluids.getFluidId(x, Math.floorMod(y, 32), z);
    }

    private Section section(int y) {
        return sections.computeIfAbsent(Math.floorDiv(y, 32), resolveSection::apply);
    }

    record Section(BlockSection blocks, FluidSection fluids) {
        static final Section EMPTY = new Section(null, null);
    }
}
