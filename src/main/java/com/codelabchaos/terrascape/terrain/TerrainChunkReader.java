package com.codelabchaos.terrascape.terrain;

import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.math.util.ChunkUtil;
import com.hypixel.hytale.server.core.universe.world.World;
import com.hypixel.hytale.server.core.universe.world.chunk.BlockChunk;
import com.hypixel.hytale.server.core.universe.world.chunk.section.BlockSection;
import com.hypixel.hytale.server.core.universe.world.chunk.section.FluidSection;
import com.hypixel.hytale.server.core.universe.world.storage.ChunkStore;
import com.hypixel.hytale.server.core.universe.world.storage.GetChunkFlags;

import java.util.HashMap;
import java.util.Map;
import java.util.function.IntFunction;

/** A world-thread-only view of a column and its section components for one snapshot. */
final class TerrainChunkReader {
    private final BlockChunk column;
    private final IntFunction<Section> resolveSection;
    private final Map<Integer, Section> sections = new HashMap<>();

    TerrainChunkReader(BlockChunk column, IntFunction<Section> resolveSection) {
        this.column = column;
        this.resolveSection = resolveSection;
    }

    static TerrainChunkReader load(World world, int chunkX, int chunkZ) {
        ChunkStore chunks = world.getChunkStore();
        long index = ChunkUtil.indexChunk(chunkX, chunkZ);
        Ref<ChunkStore> ref = chunks.getChunkReference(index);
        if (ref == null || !ref.isValid()) {
            // Preserve on-demand non-ticking loads. The SDK wait services world tasks
            // while loading; a plain join on the world thread would deadlock.
            ref = world.waitForFutureWithoutLock(chunks.getChunkReferenceAsync(index, GetChunkFlags.NONE));
        }
        if (ref == null || !ref.isValid()) {
            throw new IllegalStateException("Chunk " + chunkX + "," + chunkZ + " is not available.");
        }
        BlockChunk column = chunks.getStore().getComponent(ref, BlockChunk.getComponentType());
        if (column == null) {
            throw new IllegalStateException("Chunk " + chunkX + "," + chunkZ + " has no block column.");
        }
        return new TerrainChunkReader(column, sectionY -> {
            Ref<ChunkStore> section = chunks.getChunkSectionReference(chunkX, sectionY, chunkZ);
            if (section == null || !section.isValid()) return Section.EMPTY;
            return new Section(
                    chunks.getStore().getComponent(section, BlockSection.getComponentType()),
                    chunks.getStore().getComponent(section, FluidSection.getComponentType()));
        });
    }

    short getHeight(int x, int z) { return column.getHeight(x, z); }
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
