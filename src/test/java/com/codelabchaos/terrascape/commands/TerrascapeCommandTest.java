package com.codelabchaos.terrascape.commands;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TerrascapeCommandTest {
    @Test
    void formatExpiresAtUsesReadableDateTimeWithZone() {
        String formatted = TerrascapeCommand.formatExpiresAt(
                Instant.parse("2026-01-02T03:04:05Z"),
                ZoneId.of("UTC"));

        assertEquals("Jan 2, 2026 at 3:04 AM UTC", formatted);
    }
}
