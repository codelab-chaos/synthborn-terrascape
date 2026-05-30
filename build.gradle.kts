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
    compileOnly("com.hypixel.hytale:Server:0.5.2")

    testImplementation(platform("org.junit:junit-bom:5.10.0"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testImplementation("com.hypixel.hytale:Server:0.5.2")
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

tasks.register<Jar>("fatJar") {
    archiveBaseName.set("SynthWorldview")
    archiveVersion.set(version.toString())
    archiveClassifier.set("")

    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    from(sourceSets.main.get().output)
    from(configurations.runtimeClasspath.get().map { if (it.isDirectory) it else zipTree(it) })
}

tasks.build {
    dependsOn("fatJar")
}

val modsDir = (findProperty("modsDir") as String?)
    ?: "C:/Users/ccnef/AppData/Roaming/Hytale/UserData/Saves/synth-worldview-mvp/mods"

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
