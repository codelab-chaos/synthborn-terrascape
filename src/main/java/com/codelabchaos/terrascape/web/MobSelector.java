package com.codelabchaos.terrascape.web;

import org.joml.Vector3d;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Supplier;

import static com.codelabchaos.terrascape.web.MobTaxonomy.isSpawnMarkerType;

/**
 * The pure decision + accounting at the heart of the mob scan: given an entity's already-read flags
 * and position, decide whether to accept it as a mob candidate, updating {@link MobScanStats} and the
 * dedup set exactly as each gate is hit. The expensive reads (type lookup, full snapshot build) are
 * deferred behind {@code typeSupplier}/{@code snapshotFactory} so they only run for accepted entities
 * — the ECS adapter ({@code MobScanner}) supplies those. No entity/world state lives here, so the
 * whole gate sequence is unit-testable with plain inputs.
 */
final class MobSelector {
    private MobSelector() {
    }

    @Nullable
    static MobCandidate select(
            int refIndex,
            boolean valid,
            boolean isPlayer,
            boolean notMob,
            @Nullable String nonMobReasonForStats,
            boolean hasTransform,
            @Nullable Vector3d position,
            @Nonnull List<Vector3d> playerPositions,
            double radarSq,
            @Nonnull Supplier<String> typeSupplier,
            @Nonnull MobScanStats stats,
            @Nonnull Set<Integer> seenRefs,
            @Nonnull Function<String, MobSnapshot> snapshotFactory) {
        stats.entities++;
        if (!valid) {
            stats.invalidRefs++;
            return null;
        }
        if (seenRefs.contains(refIndex)) {
            stats.duplicates++;
            return null;
        }
        if (isPlayer) {
            stats.skippedPlayers++;
            return null;
        }
        if (notMob) {
            if (nonMobReasonForStats != null) {
                stats.addSkippedType(nonMobReasonForStats);
            }
            stats.skippedNonMobs++;
            return null;
        }
        if (!hasTransform) {
            stats.noTransform++;
            return null;
        }
        if (position == null) {
            stats.noPosition++;
            return null;
        }
        double distanceSq = nearestDistanceSq(position, playerPositions);
        if (distanceSq > radarSq) {
            stats.skippedOutsideRadar++;
            return null;
        }
        String type = typeSupplier.get();
        if (isSpawnMarkerType(type)) {
            stats.addSkippedType(type);
            stats.skippedNonMobs++;
            return null;
        }
        seenRefs.add(refIndex);
        MobCandidate candidate = new MobCandidate(distanceSq, snapshotFactory.apply(type));
        stats.accepted++;
        stats.addType(type);
        return candidate;
    }

    /** The closest {@code max} candidates by distance, as snapshots — the mob feed's final selection. */
    static List<MobSnapshot> topSnapshots(@Nonnull List<MobCandidate> candidates, int max) {
        return candidates.stream()
                .sorted(Comparator.comparingDouble(MobCandidate::distanceSq))
                .limit(max)
                .map(MobCandidate::snapshot)
                .toList();
    }

    /** Throttle gate for the periodic mob-scan log: true once at least {@code minIntervalMs} has elapsed. */
    static boolean dueForLog(long now, long last, long minIntervalMs) {
        return now - last >= minIntervalMs;
    }

    /** Log a connect sample only when players are present and the count rose since last time. */
    static boolean shouldLogConnectSample(@Nullable Integer previousPlayers, int players) {
        return players > 0 && (previousPlayers == null || previousPlayers < players);
    }

    /** Classifies why a debug candidate is accepted or skipped, given its already-read flags. */
    static String debugReason(boolean isPlayer, @Nullable String nonMobReason, boolean spawnMarker,
                              boolean playersEmpty, double distanceSq, double radarSq) {
        if (isPlayer) {
            return "player";
        }
        if (nonMobReason != null) {
            return "technical_" + nonMobReason;
        }
        if (spawnMarker) {
            return "technical_marker";
        }
        if (playersEmpty) {
            return "no_player_anchor";
        }
        if (distanceSq > radarSq) {
            return "outside_radar";
        }
        return "accepted";
    }

    static double nearestDistanceSq(@Nonnull Vector3d position, @Nonnull List<Vector3d> playerPositions) {
        double best = Double.MAX_VALUE;
        for (Vector3d playerPosition : playerPositions) {
            double dx = position.x - playerPosition.x;
            double dy = position.y - playerPosition.y;
            double dz = position.z - playerPosition.z;
            double distanceSq = dx * dx + dy * dy + dz * dz;
            if (distanceSq < best) {
                best = distanceSq;
            }
        }
        return best;
    }
}
