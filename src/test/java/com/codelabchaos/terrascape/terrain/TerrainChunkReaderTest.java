package com.codelabchaos.terrascape.terrain;

import com.hypixel.hytale.server.core.universe.world.chunk.BlockChunk;
import com.hypixel.hytale.server.core.universe.world.chunk.section.BlockSection;
import com.hypixel.hytale.server.core.universe.world.chunk.section.FluidSection;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TerrainChunkReaderTest {
    @Test
    void readsBlocksRotationsAndFluidsAcrossSectionBoundaries() {
        BlockSection lower = new BlockSection();
        BlockSection upper = new BlockSection();
        BlockSection negative = new BlockSection();
        lower.set(3, 31, 5, 7, 2, 0);
        upper.set(3, 0, 5, 8, 3, 0);
        negative.set(3, 31, 5, 9, 4, 0);
        FluidSection fluid = new FluidSection();
        fluid.setFluid(3, 0, 5, 11, (byte) 4);
        Map<Integer, TerrainChunkReader.Section> sections = Map.of(
                -1, new TerrainChunkReader.Section(negative, null),
                0, new TerrainChunkReader.Section(lower, null),
                1, new TerrainChunkReader.Section(upper, fluid));
        Map<Integer, Integer> resolutions = new HashMap<>();
        TerrainChunkReader reader = new TerrainChunkReader(new BlockChunk(-2, -3), y -> {
            resolutions.merge(y, 1, Integer::sum);
            return sections.getOrDefault(y, TerrainChunkReader.Section.EMPTY);
        });

        assertEquals(7, reader.getBlock(3, 31, 5));
        assertEquals(8, reader.getBlock(3, 32, 5));
        assertEquals(9, reader.getBlock(3, -1, 5));
        assertEquals(2, reader.getRotationIndex(3, 31, 5));
        assertEquals(3, reader.getRotationIndex(3, 32, 5));
        assertEquals(4, reader.getRotationIndex(3, -1, 5));
        assertEquals(11, reader.getFluidId(3, 32, 5));
        assertEquals(0, reader.getFluidId(3, 31, 5));
        assertEquals(Map.of(-1, 1, 0, 1, 1, 1), resolutions);
    }

    @Test
    void missingSectionsAreEmptyAndHeightAndTintComeFromColumn() {
        BlockChunk column = new BlockChunk(0, 0);
        column.setHeight(3, 5, (short) 63);
        column.setTint(3, 5, 0x7f9f3f);
        TerrainChunkReader reader = new TerrainChunkReader(column, y -> TerrainChunkReader.Section.EMPTY);
        assertEquals(63, reader.getHeight(3, 5));
        assertEquals(0x7f9f3f, reader.getTint(3, 5));
        assertEquals(0, reader.getBlock(3, 64, 5));
        assertEquals(0, reader.getRotationIndex(3, 64, 5));
        assertEquals(0, reader.getFluidId(3, 64, 5));
    }
}
