package com.codelabchaos.rcon;

import javax.annotation.Nullable;

/**
 * Minimal logging seam so the RCON core stays decoupled from any host plugin's logger.
 * Hosts adapt their own logger to this interface; tests can pass {@link #NONE}.
 */
public interface RconLog {
    void info(@Nullable String message);

    void error(@Nullable String message, @Nullable Throwable cause);

    /** Discards all output — for tests and headless use. */
    RconLog NONE = new RconLog() {
        @Override
        public void info(String message) {
        }

        @Override
        public void error(String message, Throwable cause) {
        }
    };
}
