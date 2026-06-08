plugins {
    java
}

group = "com.codelabchaos"
version = "0.1.0"

repositories {
    mavenCentral()
    maven("https://maven.hytale.com/release/")
}

dependencies {
    compileOnly("com.hypixel.hytale:Server:0.5.3")

    testImplementation(platform("org.junit:junit-bom:5.10.0"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testImplementation("com.hypixel.hytale:Server:0.5.3")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(25))
    }
}

tasks.withType<JavaCompile>().configureEach {
    options.release.set(25)
}

tasks.test {
    useJUnitPlatform()
    systemProperty("java.util.logging.manager", "com.hypixel.hytale.logger.backend.HytaleLogManager")
}

val npmCommand = if (System.getProperty("os.name").lowercase().contains("windows")) "npm.cmd" else "npm"

tasks.register<Exec>("buildWeb") {
    group = "build"
    description = "Builds the TypeScript browser app with webpack."
    workingDir = projectDir
    commandLine(npmCommand, "run", "build:web")
}

tasks.named<ProcessResources>("processResources") {
    dependsOn("buildWeb")
    exclude("web/src/**")
}

tasks.register<Jar>("fatJar") {
    archiveBaseName.set("SynthTerrascape")
    archiveVersion.set(version.toString())
    archiveClassifier.set("")

    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    from(sourceSets.main.get().output)
    from(configurations.runtimeClasspath.get().map { if (it.isDirectory) it else zipTree(it) })
}

tasks.build {
    dependsOn("fatJar")
}

// Destination Hytale "mods" folder for the save under test.
// The Hytale UserData base is resolved per-OS so plain `./gradlew deploy` works on both
// macbookpro and windowsMSI; on Windows it resolves to the same %APPDATA% path as before.
// Override per-invocation: ./gradlew deploy -PmodsDir="/path/to/other/save/mods"
val saveName = "synth-worldview-mvp"
val osName = System.getProperty("os.name").lowercase()
val hytaleSaves = when {
    osName.contains("win") -> "${System.getenv("APPDATA")}/Hytale/UserData/Saves"
    osName.contains("mac") -> "${System.getProperty("user.home")}/Library/Application Support/Hytale/UserData/Saves"
    else -> "${System.getProperty("user.home")}/.local/share/Hytale/UserData/Saves"
}
val modsDir = (findProperty("modsDir") as String?) ?: "$hytaleSaves/$saveName/mods"

tasks.register<Copy>("deploy") {
    group = "distribution"
    description = "Builds the plugin jar and copies it into the Hytale save's mods folder."

    val fatJar = tasks.named<Jar>("fatJar")
    dependsOn(fatJar)

    from(fatJar.flatMap { it.archiveFile })
    into(modsDir)

    doLast {
        logger.lifecycle("Deployed ${fatJar.get().archiveFileName.get()} -> $modsDir")
    }
}
