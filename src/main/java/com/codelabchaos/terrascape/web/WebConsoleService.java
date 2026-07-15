package com.codelabchaos.terrascape.web;

import com.codelabchaos.terrascape.TerrascapePlugin;
import com.hypixel.hytale.event.EventPriority;
import com.hypixel.hytale.event.EventRegistry;
import com.hypixel.hytale.server.core.HytaleServer;
import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.command.system.CommandManager;
import com.hypixel.hytale.server.core.command.system.CommandSender;
import com.hypixel.hytale.server.core.event.events.player.PlayerChatEvent;
import com.hypixel.hytale.server.core.permissions.PermissionsModule;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.Universe;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Consumer;
import java.util.function.LongSupplier;
import java.util.logging.Level;
import java.util.regex.Pattern;

/**
 * Terrascape's server-side adapter between its authenticated console API and Hytale chat/commands.
 * Browser code never calls a Hytale endpoint directly.
 */
public final class WebConsoleService {
    public static final int MAX_INPUT_CHARS = 512;
    public static final int HISTORY_LIMIT = 250;
    private static final long MIN_SUBMIT_INTERVAL_MS = 500L;
    private static final Pattern ANSI_PATTERN = Pattern.compile("\\[[;\\d]*m");

    public enum SubmitStatus {
        ACCEPTED,
        OFFLINE,
        INVALID,
        RATE_LIMITED,
        CANCELLED,
        FAILED
    }

    public record SubmitResult(@Nonnull SubmitStatus status, @Nullable String detail) {
        static SubmitResult accepted() {
            return new SubmitResult(SubmitStatus.ACCEPTED, null);
        }
    }

    public record HistoryEntry(
            long id,
            long timestamp,
            @Nonnull String kind,
            @Nonnull String username,
            @Nonnull String content,
            @Nonnull Set<UUID> audience
    ) {
        String toJson() {
            return "{\"id\":" + id
                    + ",\"timestamp\":" + timestamp
                    + ",\"kind\":\"" + Json.escapeJson(kind) + "\""
                    + ",\"username\":\"" + Json.escapeJson(username) + "\""
                    + ",\"content\":\"" + Json.escapeJson(content) + "\"}";
        }
    }

    private final TerrascapePlugin plugin;
    private final PlayerDirectory players;
    private final CommandDispatcher commands;
    private final PermissionLookup permissions;
    private final LongSupplier clock;
    private final AtomicLong nextHistoryId = new AtomicLong();
    private final Deque<HistoryEntry> history = new ArrayDeque<>();
    private final Map<UUID, Long> lastSubmitAt = new ConcurrentHashMap<>();

    public WebConsoleService(@Nonnull TerrascapePlugin plugin) {
        this(plugin, new PlayerDirectory() {
            @Override
            public PlayerRef online(@Nonnull UUID uuid) {
                Universe universe = Universe.get();
                return universe == null ? null : universe.getPlayer(uuid);
            }

            @Override
            public Collection<PlayerRef> all() {
                Universe universe = Universe.get();
                return universe == null ? null : universe.getPlayers();
            }
        }, (sender, command) -> CommandManager.get().handleCommand(sender, command),
                WebConsoleService::lookupPermission, System::currentTimeMillis);
    }

    WebConsoleService(
            @Nullable TerrascapePlugin plugin,
            @Nonnull PlayerDirectory players,
            @Nonnull CommandDispatcher commands,
            @Nonnull PermissionLookup permissions,
            @Nonnull LongSupplier clock
    ) {
        this.plugin = plugin;
        this.players = players;
        this.commands = commands;
        this.permissions = permissions;
        this.clock = clock;
    }

    /** Registers a last-priority observer so the web history contains accepted server chat. */
    public void register(@Nonnull EventRegistry events) {
        events.registerAsyncGlobal(EventPriority.LAST, PlayerChatEvent.class,
                future -> future.thenApply(event -> {
                    if (!event.isCancelled()) {
                        appendChat(event);
                    }
                    return event;
                }));
    }

    @Nullable
    public PlayerRef onlinePlayer(@Nonnull UUID uuid) {
        return players.online(uuid);
    }

    /** Returns global chat plus private command activity for the requesting player. */
    @Nonnull
    public synchronized List<HistoryEntry> history(@Nonnull UUID viewer, long afterId) {
        List<HistoryEntry> visible = new ArrayList<>();
        for (HistoryEntry entry : history) {
            if (entry.id() > afterId && entry.audience().contains(viewer)) {
                visible.add(entry);
            }
        }
        return List.copyOf(visible);
    }

    /**
     * Submits as the identity bound into a validated personal map link. The player does not need to
     * be online: Hytale permissions can be resolved directly from the stable player UUID.
     */
    @Nonnull
    public CompletableFuture<SubmitResult> submit(
            @Nonnull UUID subject,
            @Nonnull String subjectName,
            @Nonnull String rawInput
    ) {
        String input = rawInput.trim();
        String invalid = validateInput(input);
        if (invalid != null) {
            return CompletableFuture.completedFuture(new SubmitResult(SubmitStatus.INVALID, invalid));
        }
        if (!acceptRate(subject)) {
            return CompletableFuture.completedFuture(
                    new SubmitResult(SubmitStatus.RATE_LIMITED, "Please wait before sending again."));
        }

        PlayerRef player = onlinePlayer(subject);
        String username = player != null && player.isValid() ? player.getUsername() : subjectName;
        String action = input.startsWith("/") ? "command" : "chat";
        logInfo("Web console " + action + " request from " + username + " (" + subject + ")");
        return input.startsWith("/")
                ? submitCommand(subject, username, input)
                : submitChat(subject, username, player, input);
    }

    @Nonnull
    private CompletableFuture<SubmitResult> submitCommand(
            @Nonnull UUID subject,
            @Nonnull String username,
            @Nonnull String input
    ) {
        String command = input.substring(1).trim();
        if (command.isEmpty()) {
            return CompletableFuture.completedFuture(
                    new SubmitResult(SubmitStatus.INVALID, "Enter a command after /."));
        }
        append("command", username, input, Set.of(subject));
        LinkedPlayerSender sender = new LinkedPlayerSender(
                subject,
                username,
                permissions,
                message -> {
                    String rendered = renderMessage(message);
                    if (!rendered.isBlank()) {
                        append("system", "Server", rendered, Set.of(subject));
                    }
                });
        try {
            return commands.dispatch(sender, command).handle((ignored, error) -> {
                if (error == null) {
                    logInfo("Web console command accepted for " + username + " (" + subject + ")");
                    return SubmitResult.accepted();
                }
                logWarning("Web console command failed for " + username, error);
                append("error", "Terrascape", "Command failed.", Set.of(subject));
                return new SubmitResult(SubmitStatus.FAILED, "Command failed.");
            });
        } catch (RuntimeException error) {
            logWarning("Web console command dispatch failed for " + username, error);
            append("error", "Terrascape", "Command failed.", Set.of(subject));
            return CompletableFuture.completedFuture(new SubmitResult(SubmitStatus.FAILED, "Command failed."));
        }
    }

    @Nonnull
    private CompletableFuture<SubmitResult> submitChat(
            @Nonnull UUID subject,
            @Nonnull String username,
            @Nullable PlayerRef player,
            @Nonnull String content
    ) {
        Collection<PlayerRef> connected = players.all();
        if (connected == null) {
            return CompletableFuture.completedFuture(
                    new SubmitResult(SubmitStatus.OFFLINE, "The game server is unavailable."));
        }
        List<PlayerRef> targets = visibleChatTargets(connected, subject);
        if (player == null || !player.isValid()) {
            return submitOfflineChat(subject, username, content, targets);
        }
        PlayerChatEvent event = new PlayerChatEvent(player, targets, content);
        try {
            return HytaleServer.get().getEventBus().dispatchForAsync(PlayerChatEvent.class).dispatch(event)
                    .handle((accepted, error) -> {
                        if (error != null) {
                            logWarning("Web console chat failed for " + player.getUsername(), error);
                            return new SubmitResult(SubmitStatus.FAILED, "Chat could not be sent.");
                        }
                        if (accepted.isCancelled()) {
                            logInfo("Web console chat rejected for "
                                    + player.getUsername() + " (" + player.getUuid() + ")");
                            return new SubmitResult(SubmitStatus.CANCELLED, "Chat was blocked by the server.");
                        }
                        Message message = accepted.getFormatter().format(accepted.getSender(), accepted.getContent());
                        accepted.getTargets().forEach(target -> target.sendMessage(message));
                        logInfo("Web console chat accepted for "
                                + player.getUsername() + " (" + player.getUuid() + ")");
                        return SubmitResult.accepted();
                    });
        } catch (RuntimeException error) {
            logWarning("Web console chat dispatch failed for " + player.getUsername(), error);
            return CompletableFuture.completedFuture(
                    new SubmitResult(SubmitStatus.FAILED, "Chat could not be sent."));
        }
    }

    @Nonnull
    private CompletableFuture<SubmitResult> submitOfflineChat(
            @Nonnull UUID subject,
            @Nonnull String username,
            @Nonnull String content,
            @Nonnull List<PlayerRef> targets
    ) {
        Message message = Message.join(
                Message.raw("[Web] ").color("#72d7ff"),
                Message.raw("<" + username + "> " + content));
        try {
            targets.forEach(target -> target.sendMessage(message));
            Set<UUID> audience = new LinkedHashSet<>();
            audience.add(subject);
            targets.forEach(target -> audience.add(target.getUuid()));
            append("chat", username, content, audience);
            logInfo("Web console chat accepted for offline player " + username + " (" + subject + ")");
            return CompletableFuture.completedFuture(SubmitResult.accepted());
        } catch (RuntimeException error) {
            logWarning("Web console offline chat dispatch failed for " + username, error);
            return CompletableFuture.completedFuture(
                    new SubmitResult(SubmitStatus.FAILED, "Chat could not be sent."));
        }
    }

    @Nonnull
    private static List<PlayerRef> visibleChatTargets(
            @Nonnull Collection<PlayerRef> players,
            @Nonnull UUID sender
    ) {
        List<PlayerRef> targets = new ArrayList<>();
        for (PlayerRef target : players) {
            if (!target.getHiddenPlayersManager().isPlayerHidden(sender)) {
                targets.add(target);
            }
        }
        return targets;
    }

    @Nullable
    static String validateInput(@Nonnull String input) {
        if (input.isBlank()) {
            return "Enter a message or command.";
        }
        if (input.length() > MAX_INPUT_CHARS) {
            return "Input is too long.";
        }
        for (int i = 0; i < input.length(); i++) {
            if (Character.isISOControl(input.charAt(i))) {
                return "Input contains unsupported control characters.";
            }
        }
        return null;
    }

    private boolean acceptRate(@Nonnull UUID subject) {
        long now = clock.getAsLong();
        Long previous = lastSubmitAt.put(subject, now);
        if (previous != null && now - previous < MIN_SUBMIT_INTERVAL_MS) {
            lastSubmitAt.put(subject, previous);
            return false;
        }
        return true;
    }

    private void appendChat(@Nonnull PlayerChatEvent event) {
        Set<UUID> audience = new LinkedHashSet<>();
        audience.add(event.getSender().getUuid());
        event.getTargets().forEach(target -> audience.add(target.getUuid()));
        append("chat", event.getSender().getUsername(), event.getContent(), audience);
    }

    private synchronized void append(
            @Nonnull String kind,
            @Nonnull String username,
            @Nonnull String content,
            @Nonnull Set<UUID> audience
    ) {
        history.addLast(new HistoryEntry(
                nextHistoryId.incrementAndGet(), clock.getAsLong(),
                kind, username, content, Set.copyOf(audience)));
        while (history.size() > HISTORY_LIMIT) {
            history.removeFirst();
        }
    }

    private static boolean lookupPermission(
            @Nonnull UUID subject,
            @Nonnull String permission,
            boolean defaultValue
    ) {
        PermissionsModule permissions = PermissionsModule.get();
        return permissions != null && permissions.hasPermission(subject, permission, defaultValue);
    }

    private void logInfo(@Nonnull String message) {
        if (plugin != null) {
            plugin.getLogger().at(Level.INFO).log(message);
        }
    }

    private void logWarning(@Nonnull String message, @Nonnull Throwable error) {
        if (plugin != null) {
            plugin.getLogger().at(Level.WARNING).withCause(error).log(message);
        }
    }

    private static String renderMessage(@Nonnull Message message) {
        String raw = message.getRawText();
        if (raw != null && !raw.isBlank()) {
            return raw;
        }
        List<Message> children = message.getChildren();
        if (children != null && !children.isEmpty()) {
            StringBuilder text = new StringBuilder();
            children.forEach(child -> text.append(renderMessage(child)));
            if (!text.isEmpty()) {
                return text.toString();
            }
        }
        String ansi = message.getAnsiMessage();
        if (ansi != null && !ansi.isBlank()) {
            return ANSI_PATTERN.matcher(ansi).replaceAll("");
        }
        String id = message.getMessageId();
        return id == null ? "" : id;
    }

    @FunctionalInterface
    interface PermissionLookup {
        boolean hasPermission(@Nonnull UUID subject, @Nonnull String permission, boolean defaultValue);
    }

    interface PlayerDirectory {
        @Nullable PlayerRef online(@Nonnull UUID uuid);

        @Nullable Collection<PlayerRef> all();
    }

    @FunctionalInterface
    interface CommandDispatcher {
        @Nonnull CompletableFuture<Void> dispatch(@Nonnull CommandSender sender, @Nonnull String command);
    }

    /** Offline-capable command identity backed by Hytale's UUID permission provider. */
    static final class LinkedPlayerSender implements CommandSender {

        private final UUID uuid;
        private final String username;
        private final PermissionLookup permissions;
        private final Consumer<Message> output;

        LinkedPlayerSender(
                @Nonnull UUID uuid,
                @Nonnull String username,
                @Nonnull PermissionLookup permissions,
                @Nonnull Consumer<Message> output
        ) {
            this.uuid = uuid;
            this.username = username;
            this.permissions = permissions;
            this.output = output;
        }

        @Override
        public void sendMessage(@Nonnull Message message) {
            output.accept(message);
        }

        @Override
        public String getUsername() {
            return username;
        }

        @Override
        public UUID getUuid() {
            return uuid;
        }

        @Override
        public boolean hasPermission(String permission) {
            return permissions.hasPermission(uuid, permission, false);
        }

        @Override
        public boolean hasPermission(String permission, boolean defaultValue) {
            return permissions.hasPermission(uuid, permission, defaultValue);
        }
    }
}
