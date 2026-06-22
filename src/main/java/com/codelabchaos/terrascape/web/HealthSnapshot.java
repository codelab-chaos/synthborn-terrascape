package com.codelabchaos.terrascape.web;

/** A mob's current and maximum health, or empty when the entity exposes no health stat. */
record HealthSnapshot(Double health, Double maxHealth) {
    static HealthSnapshot empty() {
        return new HealthSnapshot(null, null);
    }
}
