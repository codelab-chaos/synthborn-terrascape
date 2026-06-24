package com.codelabchaos.rcon;

import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.command.system.CommandSender;

import javax.annotation.Nonnull;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * A {@link CommandSender} that captures command output into plain strings for the RCON
 * JSON response instead of writing to a player or console.
 */
final class BufferedCommandSender implements CommandSender {
    private static final Pattern ANSI_PATTERN = Pattern.compile("\\[[;\\d]*m");

    private final String name;
    private final UUID uuid;
    private final List<String> messages = new ArrayList<>();

    BufferedCommandSender(@Nonnull String name) {
        this.name = name;
        this.uuid = UUID.nameUUIDFromBytes(name.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public void sendMessage(@Nonnull Message message) {
        messages.add(renderMessage(message));
    }

    private static String renderMessage(@Nonnull Message message) {
        String raw = message.getRawText();
        if (raw != null && !raw.isBlank()) return raw;

        List<Message> children = message.getChildren();
        if (children != null && !children.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            for (Message child : children) {
                String childText = renderMessage(child);
                if (childText != null && !childText.isBlank()) sb.append(childText);
            }
            if (sb.length() > 0) return sb.toString();
        }

        String ansi = message.getAnsiMessage();
        if (ansi != null && !ansi.isBlank()) {
            String stripped = ANSI_PATTERN.matcher(ansi).replaceAll("");
            if (!stripped.isBlank()) return stripped;
        }

        String id = message.getMessageId();
        if (id != null && !id.isBlank()) return id;

        return "";
    }

    @Override
    public String getUsername() {
        return name;
    }

    @Override
    public UUID getUuid() {
        return uuid;
    }

    @Override
    public boolean hasPermission(String permission) {
        return true;
    }

    @Override
    public boolean hasPermission(String permission, boolean defaultValue) {
        return true;
    }

    List<String> messages() {
        return List.copyOf(messages);
    }
}
