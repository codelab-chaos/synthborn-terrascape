package com.codelabchaos.terrascape.web;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;

/**
 * Pure keyword classification of mobs/NPCs into display categories and colors, plus small label
 * helpers. No entity or world state — just string rules — so it is cheap to call and easy to test.
 */
final class MobTaxonomy {
    private MobTaxonomy() {
    }

    static String categoryForMob(@Nonnull String type) {
        return categoryForMob(type, null);
    }

    static String categoryForMob(@Nonnull String type, @Nullable String liveCategory) {
        if (liveCategory != null) {
            String normalizedCategory = liveCategory.toLowerCase();
            if (normalizedCategory.contains("undead") || normalizedCategory.contains("aggressive")
                    || normalizedCategory.contains("elemental")) {
                return "hostile";
            }
            if (normalizedCategory.contains("livestock")) {
                return "livestock";
            }
            if (normalizedCategory.contains("critter")) {
                return "critter";
            }
            if (normalizedCategory.contains("flying") || normalizedCategory.contains("avian")) {
                return "flying";
            }
            if (normalizedCategory.contains("swimming") || normalizedCategory.contains("fish")) {
                return "swimming";
            }
            if (normalizedCategory.contains("intelligent")) {
                return "npc";
            }
        }
        String normalized = type.toLowerCase();
        if (normalized.contains("boss") || normalized.contains("giant") || normalized.contains("rex")
                || normalized.contains("dragon") || normalized.contains("guardian")) {
            return "boss";
        }
        if (normalized.contains("skeleton") || normalized.contains("zombie") || normalized.contains("ghoul")
                || normalized.contains("undead") || normalized.contains("goblin") || normalized.contains("outlander")
                || normalized.contains("trork") || normalized.contains("yeti") || normalized.contains("spider")
                || normalized.contains("scarak") || normalized.contains("scorpion") || normalized.contains("void")
                || normalized.contains("hound") || normalized.contains("wolf") || normalized.contains("bear")) {
            return "hostile";
        }
        if (normalized.contains("kweebec") || normalized.contains("feran") || normalized.contains("klops")
                || normalized.contains("tuluk") || normalized.contains("slothian") || normalized.contains("bramblekin")
                || normalized.contains("elf") || normalized.contains("merchant") || normalized.contains("npc")) {
            return "npc";
        }
        if (normalized.contains("cow") || normalized.contains("pig") || normalized.contains("boar")
                || normalized.contains("bison") || normalized.contains("chicken") || normalized.contains("horse")
                || normalized.contains("goat") || normalized.contains("warthog") || normalized.contains("sheep")) {
            return "livestock";
        }
        if (normalized.contains("frog") || normalized.contains("mouse") || normalized.contains("rat")
                || normalized.contains("rabbit") || normalized.contains("squirrel") || normalized.contains("gecko")
                || normalized.contains("meerkat")) {
            return "critter";
        }
        if (normalized.contains("tetrabird") || normalized.contains("bird") || normalized.contains("duck")
                || normalized.contains("hawk") || normalized.contains("raven")
                || normalized.contains("crow") || normalized.contains("bat") || normalized.contains("owl")
                || normalized.contains("vulture") || normalized.contains("sparrow")) {
            return "flying";
        }
        if (normalized.contains("fish") || normalized.contains("shark") || normalized.contains("puffer")
                || normalized.contains("crocodile") || normalized.contains("swimming")) {
            return "swimming";
        }
        if (normalized.contains("deer") || normalized.contains("fox") || normalized.contains("penguin")) {
            return "passive";
        }
        return "unknown";
    }

    static String colorForMob(@Nonnull String type) {
        String category = categoryForMob(type);
        return switch (category) {
            case "hostile" -> "#ff5d6c";
            case "npc" -> "#7ec8ff";
            case "boss" -> "#d189ff";
            case "livestock" -> "#ffd36a";
            case "critter" -> "#8ee58b";
            case "flying" -> "#b8d8ff";
            case "swimming" -> "#62d4e7";
            case "passive" -> "#a7e06f";
            default -> fallbackMobColor(type);
        };
    }

    static String fallbackMobColor(@Nonnull String type) {
        int hash = type.hashCode();
        int hue = Math.floorMod(hash, 360);
        return "hsl(" + hue + ",70%,58%)";
    }

    static boolean isSpawnMarkerType(@Nonnull String type) {
        String normalized = type.toLowerCase();
        return normalized.contains("spawn_marker")
                || normalized.contains("spawnmark")
                || normalized.contains("spawn_mark")
                || normalized.contains("path_marker")
                || normalized.contains("pathmark")
                || normalized.contains("path_mark");
    }

    static String labelFromAssetId(String assetId) {
        if (assetId == null || assetId.isBlank()) {
            return null;
        }
        String normalized = assetId.replace('\\', '/');
        int slash = normalized.lastIndexOf('/');
        if (slash >= 0 && slash + 1 < normalized.length()) {
            normalized = normalized.substring(slash + 1);
        }
        int colon = normalized.lastIndexOf(':');
        if (colon >= 0 && colon + 1 < normalized.length()) {
            normalized = normalized.substring(colon + 1);
        }
        if (normalized.endsWith(".json")) {
            normalized = normalized.substring(0, normalized.length() - ".json".length());
        }
        normalized = normalized.trim();
        return normalized.isBlank() ? null : normalized;
    }
}
