package com.codelabchaos.rcon;

import javax.annotation.Nonnull;

/**
 * Shared Synthborn RCON configuration. Each Synthborn mod populates this from its own
 * {@code rcon.*} config section using a distinct default port.
 *
 * <p>The security schema is enforced in {@link RconServer#start()}, identically across mods:
 * <ul>
 *   <li>disabled by default ({@code enabled=false}) — the port is never opened unless enabled;</li>
 *   <li>password/token or host-provided authenticator required when enabled (fail closed);</li>
 *   <li>localhost-only unless {@code allowRemote} is set, and remote always requires auth.</li>
 * </ul>
 *
 * <p>{@code dangerPublic} is a developer escape hatch that restores the old open behavior:
 * when {@code true} an enabled endpoint may run with a blank credential (no auth). It is unsafe —
 * anyone who can reach the port runs server commands — and should only ever be used on a
 * trusted local machine.
 */
public record RconConfig(
        boolean enabled,
        @Nonnull String host,
        int port,
        @Nonnull String token,
        boolean allowRemote,
        boolean dangerPublic
) {
    public boolean hasToken() {
        return !token.isBlank();
    }
}
