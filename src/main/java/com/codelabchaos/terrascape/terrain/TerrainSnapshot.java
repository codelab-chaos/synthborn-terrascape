package com.codelabchaos.terrascape.terrain;

import java.util.Arrays;
import java.util.Comparator;

public record TerrainSnapshot(
        String worldName,
        int chunkX,
        int chunkZ,
        TerrainColumn[] columns,
        TerrainDetail[] details,
        int nonEmptyColumns,
        int minY,
        int maxY
) {
    public static final int CHUNK_SIZE = 32;

    public TerrainColumn column(int localX, int localZ) {
        if (localX < 0 || localX >= CHUNK_SIZE || localZ < 0 || localZ >= CHUNK_SIZE) {
            return null;
        }
        return columns[localZ * CHUNK_SIZE + localX];
    }

    public String mostCommonBlockKey() {
        return Arrays.stream(columns)
                .filter(column -> column != null && !column.empty() && column.blockKey() != null)
                .collect(java.util.stream.Collectors.groupingBy(
                        TerrainColumn::blockKey,
                        java.util.stream.Collectors.counting()))
                .entrySet()
                .stream()
                .max(Comparator.comparingLong(java.util.Map.Entry::getValue))
                .map(java.util.Map.Entry::getKey)
                .orElse("<none>");
    }
}
