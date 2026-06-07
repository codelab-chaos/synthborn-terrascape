package com.codelabchaos.synthworldview.terrain;

import com.hypixel.hytale.server.core.asset.type.blocktype.config.Rotation;
import com.hypixel.hytale.server.core.asset.type.blocktype.config.RotationTuple;

/** Maps block rotation + shape profile to an axis-aligned bounds box inside one voxel. */
public final class DetailBoundsOriented {
    private static final float PANEL_THIN = 0.15f;
    private static final float PANEL_WIDE_MIN = 0.34f;
    private static final float PANEL_WIDE_MAX = 0.66f;
    private static final float POST_MIN = 0.34f;
    private static final float POST_MAX = 0.66f;
    private static final float POST_TOP = 0.96f;
    private static final float HANG_MIN = 0.40f;
    private static final float HANG_MAX = 0.60f;

    private DetailBoundsOriented() {
    }

    public static DetailBounds bounds(TerrainDetail.Shape shape, int rotationIndex) {
        RotationTuple rotation = RotationTuple.get(clampRotationIndex(rotationIndex));
        return bounds(shape, rotation.yaw(), rotation.pitch(), rotation.roll());
    }

    private static int clampRotationIndex(int rotationIndex) {
        return Math.max(0, Math.min(255, rotationIndex));
    }

    private static DetailBounds bounds(
            TerrainDetail.Shape shape,
            Rotation yaw,
            Rotation pitch,
            Rotation roll
    ) {
        return switch (shape) {
            case THIN_PANEL -> thinPanel(yaw);
            case HANGING_STRIP -> hangingStrip(yaw);
            case POST -> orientedPost(yaw, pitch, roll);
            case LIGHT -> new DetailBounds(0.26f, 0.08f, 0.26f, 0.74f, 0.88f, 0.74f);
            case SMALL_FOLIAGE -> new DetailBounds(0.18f, 0.0f, 0.18f, 0.82f, 0.72f, 0.82f);
            case TOP_SLAB -> new DetailBounds(0.0f, 0.64f, 0.0f, 1.0f, 1.0f, 1.0f);
            default -> new DetailBounds(0.0f, 0.0f, 0.0f, 1.0f, 1.0f, 1.0f);
        };
    }

    /** NESW panel flush to the block face, matching ladder/door hitboxes. */
    private static DetailBounds thinPanel(Rotation yaw) {
        return switch (yaw) {
            case Ninety -> new DetailBounds(1.0f - PANEL_THIN, 0.0f, PANEL_WIDE_MIN, 1.0f, 1.0f, PANEL_WIDE_MAX);
            case OneEighty -> new DetailBounds(PANEL_WIDE_MIN, 0.0f, 1.0f - PANEL_THIN, PANEL_WIDE_MAX, 1.0f, 1.0f);
            case TwoSeventy -> new DetailBounds(0.0f, 0.0f, PANEL_WIDE_MIN, PANEL_THIN, 1.0f, PANEL_WIDE_MAX);
            default -> new DetailBounds(PANEL_WIDE_MIN, 0.0f, 0.0f, PANEL_WIDE_MAX, 1.0f, PANEL_THIN);
        };
    }

    private static DetailBounds hangingStrip(Rotation yaw) {
        return switch (yaw) {
            case Ninety -> new DetailBounds(HANG_MAX, 0.0f, HANG_MIN, HANG_MAX, 1.0f, HANG_MAX);
            case OneEighty -> new DetailBounds(HANG_MIN, 0.0f, HANG_MAX, HANG_MAX, 1.0f, HANG_MAX);
            case TwoSeventy -> new DetailBounds(HANG_MIN, 0.0f, HANG_MIN, HANG_MIN, 1.0f, HANG_MAX);
            default -> new DetailBounds(HANG_MIN, 0.0f, HANG_MIN, HANG_MAX, 1.0f, HANG_MIN);
        };
    }

    /** Vertical post by default; pipe/beam rotations flatten along X or Z. */
    private static DetailBounds orientedPost(Rotation yaw, Rotation pitch, Rotation roll) {
        if (isHorizontalAxis(pitch) || isHorizontalAxis(roll)) {
            return horizontalPost(yaw, pitch, roll);
        }
        return new DetailBounds(POST_MIN, 0.0f, POST_MIN, POST_MAX, POST_TOP, POST_MAX);
    }

    private static DetailBounds horizontalPost(Rotation yaw, Rotation pitch, Rotation roll) {
        if (isHorizontalAxis(pitch)) {
            return new DetailBounds(POST_MIN, POST_MIN, 0.0f, POST_MAX, POST_MAX, 1.0f);
        }
        if (isHorizontalAxis(roll)) {
            return new DetailBounds(0.0f, POST_MIN, POST_MIN, 1.0f, POST_MAX, POST_MAX);
        }
        return switch (yaw) {
            case Ninety, TwoSeventy -> new DetailBounds(POST_MIN, POST_MIN, 0.0f, POST_MAX, POST_MAX, 1.0f);
            default -> new DetailBounds(0.0f, POST_MIN, POST_MIN, 1.0f, POST_MAX, POST_MAX);
        };
    }

    private static boolean isHorizontalAxis(Rotation rotation) {
        return rotation == Rotation.Ninety || rotation == Rotation.TwoSeventy;
    }

    public record DetailBounds(float minX, float minY, float minZ, float maxX, float maxY, float maxZ) {
    }
}
