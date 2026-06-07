package com.codelabchaos.synthworldview.terrain;

import javax.annotation.Nullable;
import java.util.Locale;

/** Keyword rules for cheap oriented cosmetic detail shapes. */
public final class CosmeticShapeRules {
    private CosmeticShapeRules() {
    }

    public static boolean matchesCosmetic(@Nullable String blockKey) {
        String key = normalize(blockKey);
        if (key.isEmpty()) {
            return false;
        }
        return containsAny(key,
                "plank", "roof", "shingle", "thatch", "tile", "timber",
                "bridge", "boardwalk", "walkway", "platform", "deck", "board", "floor",
                "scaffold", "beam", "post", "pillar", "fence",
                "rope", "ladder", "chain", "hanging",
                "torch", "fire", "lantern", "candle",
                "crate", "barrel", "chair", "table", "bench", "bed",
                "door", "window", "glass", "gate", "trapdoor", "hatch", "shutter", "portcullis",
                "carpet", "rug", "banner", "sign", "stair", "slab")
                || isWoodRail(key)
                || isStructuralWood(key);
    }

    public static TerrainDetail.Shape shapeFor(@Nullable String blockKey) {
        String key = normalize(blockKey);
        if (isLightDetail(key)) {
            return TerrainDetail.Shape.LIGHT;
        }
        if (isTopSlabDetail(key)) {
            return TerrainDetail.Shape.TOP_SLAB;
        }
        if (isThinPanelDetail(key)) {
            return TerrainDetail.Shape.THIN_PANEL;
        }
        if (isHangingStripDetail(key)) {
            return TerrainDetail.Shape.HANGING_STRIP;
        }
        if (isPostDetail(key)) {
            return TerrainDetail.Shape.POST;
        }
        return TerrainDetail.Shape.FULL;
    }

    public static TerrainDetail.Kind kindFor(@Nullable String blockKey, boolean usesSimpleShapes) {
        if (!usesSimpleShapes) {
            return TerrainDetail.Kind.COSMETIC_VOXEL;
        }
        String key = normalize(blockKey);
        if (isLightDetail(key)) {
            return TerrainDetail.Kind.COSMETIC_LIGHT;
        }
        TerrainDetail.Shape shape = shapeFor(blockKey);
        if (shape == TerrainDetail.Shape.THIN_PANEL
                || shape == TerrainDetail.Shape.HANGING_STRIP
                || shape == TerrainDetail.Shape.POST
                || shape == TerrainDetail.Shape.LIGHT) {
            return TerrainDetail.Kind.COSMETIC_THIN;
        }
        return TerrainDetail.Kind.COSMETIC_VOXEL;
    }

    public static boolean preferDetailLayer(@Nullable String blockKey, boolean usesSimpleShapes) {
        if (!usesSimpleShapes) {
            return false;
        }
        return switch (shapeFor(blockKey)) {
            case THIN_PANEL, POST, HANGING_STRIP, LIGHT -> true;
            default -> false;
        };
    }

    public static boolean usesBlockRotation(@Nullable String blockKey) {
        return switch (shapeFor(blockKey)) {
            case THIN_PANEL, HANGING_STRIP, POST -> true;
            default -> false;
        };
    }

    private static boolean isTopSlabDetail(String key) {
        return containsAny(key,
                "bridge", "boardwalk", "walkway", "platform", "deck", "board", "floor",
                "plank", "slab", "stair", "carpet", "rug", "thatch", "tile");
    }

    private static boolean isThinPanelDetail(String key) {
        return containsAny(key,
                "door", "window", "glass", "ladder", "banner", "sign",
                "gate", "trapdoor", "hatch", "shutter", "portcullis");
    }

    private static boolean isHangingStripDetail(String key) {
        return containsAny(key, "rope", "chain", "hanging");
    }

    private static boolean isPostDetail(String key) {
        if (containsAny(key, "post", "pillar", "fence", "scaffold", "beam")) {
            return true;
        }
        return isWoodRail(key);
    }

    private static boolean isLightDetail(String key) {
        return containsAny(key, "torch", "fire", "lantern", "candle");
    }

    private static boolean isWoodRail(String key) {
        return key.contains("rail") && !isMinecartRail(key);
    }

    private static boolean isMinecartRail(String key) {
        return key.contains("tinkering")
                || key.contains("minecart")
                || key.contains("mine_cart")
                || key.contains("cart_rail");
    }

    private static boolean isStructuralWood(String key) {
        return (key.contains("wood_") || key.contains("_wood") || key.contains("wooden"))
                && !key.contains("trunk")
                && !key.contains("log")
                && !key.contains("branch")
                && !key.contains("bough");
    }

    private static boolean containsAny(String key, String... needles) {
        for (String needle : needles) {
            if (key.contains(needle)) {
                return true;
            }
        }
        return false;
    }

    private static String normalize(@Nullable String blockKey) {
        return blockKey == null ? "" : blockKey.toLowerCase(Locale.ROOT);
    }
}
