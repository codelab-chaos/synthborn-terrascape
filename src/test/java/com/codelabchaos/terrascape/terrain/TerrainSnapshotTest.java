package com.codelabchaos.terrascape.terrain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;

class TerrainSnapshotTest {

    private static TerrainColumn solid(int localX, int localZ, String key) {
        return new TerrainColumn(localX, localZ, 64, 12, 0, key, 0x808080, false);
    }

    private static TerrainSnapshot snapshot(TerrainColumn[] columns) {
        return new TerrainSnapshot("world", 0, 0, columns, new TerrainDetail[0], 0, 0, 64);
    }

    @Test
    void columnResolvesByRowMajorIndex() {
        TerrainColumn[] columns = new TerrainColumn[TerrainSnapshot.CHUNK_SIZE * TerrainSnapshot.CHUNK_SIZE];
        TerrainColumn target = solid(3, 2, "stone");
        columns[2 * TerrainSnapshot.CHUNK_SIZE + 3] = target;
        TerrainSnapshot snap = snapshot(columns);

        assertSame(target, snap.column(3, 2));
    }

    @Test
    void columnOutOfBoundsReturnsNull() {
        TerrainSnapshot snap = snapshot(new TerrainColumn[TerrainSnapshot.CHUNK_SIZE * TerrainSnapshot.CHUNK_SIZE]);
        assertNull(snap.column(-1, 0));
        assertNull(snap.column(0, -1));
        assertNull(snap.column(TerrainSnapshot.CHUNK_SIZE, 0));
        assertNull(snap.column(0, TerrainSnapshot.CHUNK_SIZE));
    }

    @Test
    void mostCommonBlockKeyPicksTheModeAmongNonEmptyColumns() {
        TerrainColumn[] columns = new TerrainColumn[TerrainSnapshot.CHUNK_SIZE * TerrainSnapshot.CHUNK_SIZE];
        columns[0] = solid(0, 0, "stone");
        columns[1] = solid(1, 0, "stone");
        columns[2] = solid(2, 0, "dirt");
        assertEquals("stone", snapshot(columns).mostCommonBlockKey());
    }

    @Test
    void mostCommonBlockKeyIgnoresEmptyAndNullColumns() {
        TerrainColumn[] columns = new TerrainColumn[TerrainSnapshot.CHUNK_SIZE * TerrainSnapshot.CHUNK_SIZE];
        // air column (empty) with a key that should be ignored
        columns[0] = new TerrainColumn(0, 0, 64, 0, 0, "air", 0, false);
        columns[1] = solid(1, 0, "grass");
        assertEquals("grass", snapshot(columns).mostCommonBlockKey());
    }

    @Test
    void mostCommonBlockKeyFallsBackWhenNothingQualifies() {
        TerrainColumn[] columns = new TerrainColumn[TerrainSnapshot.CHUNK_SIZE * TerrainSnapshot.CHUNK_SIZE];
        assertEquals("<none>", snapshot(columns).mostCommonBlockKey());
    }
}
