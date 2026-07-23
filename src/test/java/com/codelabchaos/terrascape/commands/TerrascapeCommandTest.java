package com.codelabchaos.terrascape.commands;

import com.hypixel.hytale.server.core.command.system.AbstractCommand;
import com.hypixel.hytale.server.core.command.system.arguments.system.Argument;
import com.hypixel.hytale.server.core.command.system.suggestion.SuggestionResult;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class TerrascapeCommandTest {
    @Test
    void registersDiscoverablePermissionAwareCommandTree() throws Exception {
        TerrascapeCommand root = new TerrascapeCommand(null);
        root.completeRegistration();

        Map<String, AbstractCommand> children = root.getSubCommands();
        assertEquals(Set.of("maplink", "status", "clearcache", "maptoken", "tokens", "revoketoken"),
                children.keySet());
        assertEquals(TerrascapeCommand.PERM_MAP_USE, root.getPermission());
        assertEquals(TerrascapeCommand.PERM_MAP_USE, children.get("maplink").getPermission());
        assertAll(List.of("status", "clearcache", "maptoken", "tokens", "revoketoken").stream()
                .map(name -> () -> assertEquals(TerrascapeCommand.PERM_ADMIN,
                        children.get(name).getPermission(), name)));

        assertEquals(1, children.get("clearcache").getVariantCommands().size());
        assertEquals(List.of("tokenId"), children.get("revoketoken").getRequiredArguments().stream()
                .map(Argument::getName)
                .toList());
    }

    @Test
    void constrainedArgumentsProvideAutocompleteSuggestions() {
        TerrascapeCommand root = new TerrascapeCommand(null);

        assertEquals(Set.of("mesh", "tiles", "all"), suggestionsFor(root, "clearcache", 1, "target"));
    }

    private static Set<String> suggestionsFor(
            TerrascapeCommand root,
            String commandName,
            int variantArgCount,
            String argumentName
    ) {
        AbstractCommand variant = root.getSubCommands().get(commandName).getVariantByArgCount(variantArgCount);
        assertNotNull(variant);
        Argument<?, ?> argument = variant.getRequiredArguments().stream()
                .filter(candidate -> candidate.getName().equals(argumentName))
                .findFirst()
                .orElse(null);
        assertNotNull(argument);
        SuggestionResult result = new SuggestionResult();
        argument.getArgumentType().suggest(null, "", 0, result);
        return Set.copyOf(result.getSuggestions());
    }

    @Test
    void formatExpiresAtUsesReadableDateTimeWithZone() {
        String formatted = TerrascapeCommand.formatExpiresAt(
                Instant.parse("2026-01-02T03:04:05Z"),
                ZoneId.of("UTC"));

        assertEquals("Jan 2, 2026 at 3:04 AM UTC", formatted);
    }
}
