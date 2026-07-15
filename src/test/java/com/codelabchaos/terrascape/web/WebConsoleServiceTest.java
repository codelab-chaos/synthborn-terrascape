package com.codelabchaos.terrascape.web;

import com.hypixel.hytale.server.core.Message;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WebConsoleServiceTest {
    @Test
    void validatesConsoleInput() {
        assertNotNull(WebConsoleService.validateInput(""));
        assertNotNull(WebConsoleService.validateInput("hello\nworld"));
        assertNotNull(WebConsoleService.validateInput("x".repeat(WebConsoleService.MAX_INPUT_CHARS + 1)));
        assertNull(WebConsoleService.validateInput("hello world"));
        assertNull(WebConsoleService.validateInput("/time set day"));
    }

    @Test
    void linkedSenderRetainsOfflineIdentityAndDelegatesPermissionsByUuid() {
        UUID player = UUID.randomUUID();
        List<Message> output = new ArrayList<>();
        WebConsoleService.LinkedPlayerSender sender = new WebConsoleService.LinkedPlayerSender(
                player,
                "Aster",
                (subject, permission, defaultValue) -> subject.equals(player)
                        && permission.equals("allowed.command"),
                output::add);

        assertEquals(player, sender.getUuid());
        assertEquals("Aster", sender.getUsername());
        assertTrue(sender.hasPermission("allowed.command"));
        assertFalse(sender.hasPermission("denied.command", true));

        Message response = Message.raw("command output");
        sender.sendMessage(response);
        assertEquals(List.of(response), output);
    }

    @Test
    void offlineChatIsRateLimitedAndStoredOnlyForItsAudience() {
        AtomicLong clock = new AtomicLong(1_000);
        WebConsoleService service = service(clock, (sender, command) -> CompletableFuture.completedFuture(null),
                List.of());
        UUID player = UUID.randomUUID();

        assertEquals(WebConsoleService.SubmitStatus.ACCEPTED,
                service.submit(player, "Aster", " hello ").join().status());
        assertEquals(WebConsoleService.SubmitStatus.RATE_LIMITED,
                service.submit(player, "Aster", "too fast").join().status());
        clock.addAndGet(500);
        assertEquals(WebConsoleService.SubmitStatus.ACCEPTED,
                service.submit(player, "Aster", "second").join().status());

        List<WebConsoleService.HistoryEntry> visible = service.history(player, 0);
        assertEquals(List.of("hello", "second"), visible.stream().map(WebConsoleService.HistoryEntry::content).toList());
        assertTrue(service.history(UUID.randomUUID(), 0).isEmpty());
        assertEquals(List.of("second"), service.history(player, visible.getFirst().id()).stream()
                .map(WebConsoleService.HistoryEntry::content)
                .toList());
    }

    @Test
    void historyEvictsOldestEntriesAtTheConfiguredLimit() {
        AtomicLong clock = new AtomicLong(1_000);
        WebConsoleService service = service(clock, (sender, command) -> CompletableFuture.completedFuture(null),
                List.of());
        List<UUID> viewers = new ArrayList<>();

        for (int i = 0; i <= WebConsoleService.HISTORY_LIMIT; i++) {
            UUID viewer = UUID.randomUUID();
            viewers.add(viewer);
            assertEquals(WebConsoleService.SubmitStatus.ACCEPTED,
                    service.submit(viewer, "Player" + i, "message-" + i).join().status());
            clock.incrementAndGet();
        }

        assertTrue(service.history(viewers.getFirst(), 0).isEmpty());
        assertEquals("message-" + WebConsoleService.HISTORY_LIMIT,
                service.history(viewers.getLast(), 0).getFirst().content());
    }

    @Test
    void commandDispatchCapturesPrivateInputAndServerOutput() {
        AtomicLong clock = new AtomicLong(1_000);
        List<String> dispatched = new ArrayList<>();
        WebConsoleService service = service(clock, (sender, command) -> {
            dispatched.add(command);
            sender.sendMessage(Message.raw("Time set to day"));
            return CompletableFuture.completedFuture(null);
        }, List.of());
        UUID player = UUID.randomUUID();

        WebConsoleService.SubmitResult result = service.submit(player, "Aster", "/time set day").join();

        assertEquals(WebConsoleService.SubmitStatus.ACCEPTED, result.status());
        assertEquals(List.of("time set day"), dispatched);
        List<WebConsoleService.HistoryEntry> history = service.history(player, 0);
        assertEquals(List.of("command", "system"), history.stream().map(WebConsoleService.HistoryEntry::kind).toList());
        assertEquals(List.of("/time set day", "Time set to day"),
                history.stream().map(WebConsoleService.HistoryEntry::content).toList());
        assertTrue(service.history(UUID.randomUUID(), 0).isEmpty());
    }

    @Test
    void commandFailureAndDispatchExceptionReturnFailedAndAppendError() {
        UUID failedPlayer = UUID.randomUUID();
        WebConsoleService failed = service(new AtomicLong(1_000),
                (sender, command) -> CompletableFuture.failedFuture(new IllegalStateException("nope")), List.of());
        assertEquals(WebConsoleService.SubmitStatus.FAILED,
                failed.submit(failedPlayer, "Aster", "/denied").join().status());
        assertEquals("error", failed.history(failedPlayer, 0).getLast().kind());

        UUID thrownPlayer = UUID.randomUUID();
        WebConsoleService thrown = service(new AtomicLong(1_000), (sender, command) -> {
            throw new IllegalStateException("boom");
        }, List.of());
        assertEquals(WebConsoleService.SubmitStatus.FAILED,
                thrown.submit(thrownPlayer, "Bryn", "/broken").join().status());
        assertEquals("error", thrown.history(thrownPlayer, 0).getLast().kind());
    }

    @Test
    void missingUniverseAndSlashWithoutCommandFailSafely() {
        WebConsoleService unavailable = service(new AtomicLong(1_000),
                (sender, command) -> CompletableFuture.completedFuture(null), null);
        assertEquals(WebConsoleService.SubmitStatus.OFFLINE,
                unavailable.submit(UUID.randomUUID(), "Aster", "hello").join().status());

        WebConsoleService available = service(new AtomicLong(1_000),
                (sender, command) -> CompletableFuture.completedFuture(null), List.of());
        assertEquals(WebConsoleService.SubmitStatus.INVALID,
                available.submit(UUID.randomUUID(), "Aster", "/").join().status());
    }

    private static WebConsoleService service(
            AtomicLong clock,
            WebConsoleService.CommandDispatcher commands,
            Collection<com.hypixel.hytale.server.core.universe.PlayerRef> connected
    ) {
        WebConsoleService.PlayerDirectory players = new WebConsoleService.PlayerDirectory() {
            @Override
            public com.hypixel.hytale.server.core.universe.PlayerRef online(UUID uuid) {
                return null;
            }

            @Override
            public Collection<com.hypixel.hytale.server.core.universe.PlayerRef> all() {
                return connected;
            }
        };
        return new WebConsoleService(null, players, commands,
                (subject, permission, defaultValue) -> permission.equals("allowed.command"),
                clock::get);
    }
}
