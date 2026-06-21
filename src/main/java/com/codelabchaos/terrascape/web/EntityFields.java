package com.codelabchaos.terrascape.web;

import com.hypixel.hytale.component.ArchetypeChunk;
import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.math.vector.Rotation3f;
import com.hypixel.hytale.server.core.entity.Entity;
import com.hypixel.hytale.server.core.entity.UUIDComponent;
import com.hypixel.hytale.server.core.entity.entities.BlockEntity;
import com.hypixel.hytale.server.core.entity.entities.ProjectileComponent;
import com.hypixel.hytale.server.core.modules.entity.EntityModule;
import com.hypixel.hytale.server.core.modules.entity.component.ModelComponent;
import com.hypixel.hytale.server.core.modules.entity.component.PersistentModel;
import com.hypixel.hytale.server.core.modules.entity.component.TransformComponent;
import com.hypixel.hytale.server.core.modules.entity.item.ItemComponent;
import com.hypixel.hytale.server.core.modules.entitystats.EntityStatMap;
import com.hypixel.hytale.server.core.modules.entitystats.EntityStatValue;
import com.hypixel.hytale.server.core.modules.entitystats.asset.DefaultEntityStatTypes;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;
import com.hypixel.hytale.server.npc.entities.NPCEntity;
import com.hypixel.hytale.server.npc.role.Role;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.ArrayList;
import java.util.List;

import static com.codelabchaos.terrascape.web.MobTaxonomy.labelFromAssetId;

/**
 * Defensive readers that pull display fields (type, role, model, id, health, yaw, …) off Hytale
 * entity components. Every accessor swallows component-access failures and falls back to a safe
 * default, so the web snapshots never break on a half-initialized or unexpected entity.
 */
final class EntityFields {
    private EntityFields() {
    }

    static boolean isDefinitelyNotMob(@Nonnull ArchetypeChunk<EntityStore> chunk, int index) {
        return nonMobReason(chunk, index) != null;
    }

    @Nullable
    static String nonMobReason(@Nonnull ArchetypeChunk<EntityStore> chunk, int index) {
        if (chunk.getComponent(index, ItemComponent.getComponentType()) != null) {
            return "item";
        }
        if (chunk.getComponent(index, ProjectileComponent.getComponentType()) != null) {
            return "projectile";
        }
        if (chunk.getComponent(index, BlockEntity.getComponentType()) != null) {
            return "block_entity";
        }
        return null;
    }

    @Nullable
    static String nonMobReason(@Nonnull Store<EntityStore> store, @Nonnull Ref<EntityStore> ref) {
        if (store.getComponent(ref, ItemComponent.getComponentType()) != null) {
            return "item";
        }
        if (store.getComponent(ref, ProjectileComponent.getComponentType()) != null) {
            return "projectile";
        }
        if (store.getComponent(ref, BlockEntity.getComponentType()) != null) {
            return "block_entity";
        }
        return null;
    }

    static boolean isDefinitelyNotMob(@Nonnull Store<EntityStore> store, @Nonnull Ref<EntityStore> ref) {
        return nonMobReason(store, ref) != null;
    }

    static String safeMobType(@Nonnull ArchetypeChunk<EntityStore> chunk,
                              int index,
                              NPCEntity npc,
                              Entity entity) {
        if (npc != null) {
            try {
                String roleName = npc.getRoleName();
                if (roleName != null && !roleName.isBlank()) {
                    return roleName;
                }
            } catch (Exception ignored) {
            }
            try {
                String type = npc.getNPCTypeId();
                if (type != null && !type.isBlank()) {
                    return type;
                }
            } catch (Exception ignored) {
            }
        }
        String modelType = safeModelType(chunk, index);
        if (modelType != null) {
            return modelType;
        }
        return safeEntityType(entity);
    }

    static String safeMobType(@Nonnull Store<EntityStore> store,
                              @Nonnull Ref<EntityStore> ref,
                              NPCEntity npc) {
        if (npc != null) {
            try {
                String roleName = npc.getRoleName();
                if (roleName != null && !roleName.isBlank()) {
                    return roleName;
                }
            } catch (Exception ignored) {
            }
            try {
                String type = npc.getNPCTypeId();
                if (type != null && !type.isBlank()) {
                    return type;
                }
            } catch (Exception ignored) {
            }
        }
        String modelType = safeModelType(store, ref);
        return modelType == null ? "LivingEntity" : modelType;
    }

    @Nullable
    static String safeModelType(@Nonnull ArchetypeChunk<EntityStore> chunk, int index) {
        try {
            ModelComponent modelComponent = chunk.getComponent(index, ModelComponent.getComponentType());
            if (modelComponent != null && modelComponent.getModel() != null) {
                String modelAssetId = modelComponent.getModel().getModelAssetId();
                String type = labelFromAssetId(modelAssetId);
                if (type != null) {
                    return type;
                }
                type = labelFromAssetId(modelComponent.getModel().getModel());
                if (type != null) {
                    return type;
                }
            }
        } catch (Exception ignored) {
        }
        try {
            PersistentModel persistentModel = chunk.getComponent(index, PersistentModel.getComponentType());
            if (persistentModel != null && persistentModel.getModelReference() != null) {
                String type = labelFromAssetId(persistentModel.getModelReference().getModelAssetId());
                if (type != null) {
                    return type;
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    @Nullable
    static String safeMobRole(NPCEntity npc, Entity entity, @Nonnull String fallback) {
        if (npc != null) {
            try {
                String roleName = npc.getRoleName();
                if (roleName != null && !roleName.isBlank()) {
                    return roleName;
                }
            } catch (Exception ignored) {
            }
        }
        return fallback;
    }

    static String safeMobId(@Nonnull ArchetypeChunk<EntityStore> chunk,
                            int index,
                            @Nonnull Ref<EntityStore> ref) {
        try {
            UUIDComponent uuidComponent = chunk.getComponent(index, UUIDComponent.getComponentType());
            if (uuidComponent != null && uuidComponent.getUuid() != null) {
                return uuidComponent.getUuid().toString();
            }
        } catch (Exception ignored) {
        }
        return "idx-" + ref.getIndex();
    }

    static String safeMobId(@Nonnull Store<EntityStore> store, @Nonnull Ref<EntityStore> ref) {
        try {
            UUIDComponent uuidComponent = store.getComponent(ref, UUIDComponent.getComponentType());
            if (uuidComponent != null && uuidComponent.getUuid() != null) {
                return uuidComponent.getUuid().toString();
            }
        } catch (Exception ignored) {
        }
        return "idx-" + ref.getIndex();
    }

    @Nullable
    static String safeNpcNameTranslationKey(NPCEntity npc) {
        if (npc == null) {
            return null;
        }
        try {
            Role role = npc.getRole();
            String translationKey = role == null ? null : role.getNameTranslationKey();
            if (translationKey != null && !translationKey.isBlank()) {
                return translationKey;
            }
        } catch (Exception ignored) {
        }
        String roleName = safeNpcRoleName(npc);
        return roleName == null ? null : "server.npcRoles." + roleName + ".name";
    }

    @Nullable
    static NpcRoleIndex.Entry liveNpcEntry(@Nonnull NpcRoleIndex npcRoleIndex,
                                           @Nullable String type,
                                           @Nullable String role,
                                           @Nullable String modelAsset,
                                           @Nullable String persistentModelAsset) {
        List<String> candidates = new ArrayList<>();
        if (type != null) candidates.add(type);
        if (role != null) candidates.add(role);
        String modelType = labelFromAssetId(modelAsset);
        if (modelType != null) candidates.add(modelType);
        String persistentModelType = labelFromAssetId(persistentModelAsset);
        if (persistentModelType != null) candidates.add(persistentModelType);
        for (String candidate : candidates) {
            NpcRoleIndex.Entry entry = npcRoleIndex.resolve(candidate);
            if (entry != null) {
                return entry;
            }
        }
        return null;
    }

    @Nullable
    static String safeModelType(@Nonnull Store<EntityStore> store, @Nonnull Ref<EntityStore> ref) {
        try {
            ModelComponent modelComponent = store.getComponent(ref, ModelComponent.getComponentType());
            if (modelComponent != null && modelComponent.getModel() != null) {
                String modelAssetId = modelComponent.getModel().getModelAssetId();
                String type = labelFromAssetId(modelAssetId);
                if (type != null) {
                    return type;
                }
                type = labelFromAssetId(modelComponent.getModel().getModel());
                if (type != null) {
                    return type;
                }
            }
        } catch (Exception ignored) {
        }
        try {
            PersistentModel persistentModel = store.getComponent(ref, PersistentModel.getComponentType());
            if (persistentModel != null && persistentModel.getModelReference() != null) {
                String type = labelFromAssetId(persistentModel.getModelReference().getModelAssetId());
                if (type != null) {
                    return type;
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    @Nullable
    static String safeNpcRoleName(NPCEntity npc) {
        if (npc == null) {
            return null;
        }
        try {
            String roleName = npc.getRoleName();
            return roleName == null || roleName.isBlank() ? null : roleName;
        } catch (Exception ignored) {
            return null;
        }
    }

    @Nullable
    static Integer safeNpcTypeIndex(NPCEntity npc) {
        if (npc == null) {
            return null;
        }
        try {
            int value = npc.getNPCTypeIndex();
            return value < 0 ? null : value;
        } catch (Exception ignored) {
            return null;
        }
    }

    @Nullable
    static Integer safeNpcRoleIndex(NPCEntity npc) {
        if (npc == null) {
            return null;
        }
        try {
            int value = npc.getRoleIndex();
            return value < 0 ? null : value;
        } catch (Exception ignored) {
            return null;
        }
    }

    @Nullable
    static Float safeYaw(@Nonnull TransformComponent transform) {
        try {
            Rotation3f rotation = transform.getRotation();
            return rotation == null || !Float.isFinite(rotation.yaw()) ? null : rotation.yaw();
        } catch (Exception ignored) {
            return null;
        }
    }

    @Nullable
    static String safeModelAssetId(@Nonnull ArchetypeChunk<EntityStore> chunk, int index) {
        try {
            ModelComponent modelComponent = chunk.getComponent(index, ModelComponent.getComponentType());
            if (modelComponent != null && modelComponent.getModel() != null) {
                String assetId = modelComponent.getModel().getModelAssetId();
                if (assetId != null && !assetId.isBlank()) {
                    return assetId;
                }
                assetId = modelComponent.getModel().getModel();
                if (assetId != null && !assetId.isBlank()) {
                    return assetId;
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    @Nullable
    static String safeModelAssetId(@Nonnull Store<EntityStore> store, @Nonnull Ref<EntityStore> ref) {
        try {
            ModelComponent modelComponent = store.getComponent(ref, ModelComponent.getComponentType());
            if (modelComponent != null && modelComponent.getModel() != null) {
                String assetId = modelComponent.getModel().getModelAssetId();
                if (assetId != null && !assetId.isBlank()) {
                    return assetId;
                }
                assetId = modelComponent.getModel().getModel();
                if (assetId != null && !assetId.isBlank()) {
                    return assetId;
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    @Nullable
    static String safePersistentModelAssetId(@Nonnull ArchetypeChunk<EntityStore> chunk, int index) {
        try {
            PersistentModel persistentModel = chunk.getComponent(index, PersistentModel.getComponentType());
            if (persistentModel != null && persistentModel.getModelReference() != null) {
                String assetId = persistentModel.getModelReference().getModelAssetId();
                return assetId == null || assetId.isBlank() ? null : assetId;
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    @Nullable
    static String safePersistentModelAssetId(@Nonnull Store<EntityStore> store, @Nonnull Ref<EntityStore> ref) {
        try {
            PersistentModel persistentModel = store.getComponent(ref, PersistentModel.getComponentType());
            if (persistentModel != null && persistentModel.getModelReference() != null) {
                String assetId = persistentModel.getModelReference().getModelAssetId();
                return assetId == null || assetId.isBlank() ? null : assetId;
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    static HealthSnapshot safeHealth(@Nonnull Store<EntityStore> store, @Nonnull Ref<EntityStore> ref) {
        try {
            EntityStatMap statMap = store.getComponent(ref, EntityStatMap.getComponentType());
            if (statMap == null) {
                return HealthSnapshot.empty();
            }
            EntityStatValue health = statMap.get(DefaultEntityStatTypes.getHealth());
            if (health == null) {
                health = statMap.get("health");
            }
            if (health == null) {
                return HealthSnapshot.empty();
            }
            return new HealthSnapshot((double) health.get(), (double) health.getMax());
        } catch (Exception ignored) {
            return HealthSnapshot.empty();
        }
    }

    static String safeEntityType(Entity entity) {
        if (entity == null) {
            return "LivingEntity";
        }
        try {
            String identifier = EntityModule.get().getIdentifier(entity.getClass());
            if (identifier != null && !identifier.isBlank()) {
                return identifier;
            }
        } catch (Exception ignored) {
        }
        String simpleName = entity.getClass().getSimpleName();
        return simpleName == null || simpleName.isBlank() ? "LivingEntity" : simpleName;
    }
}
