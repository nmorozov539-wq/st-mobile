import java.net.URI
import java.security.MessageDigest
import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "app.pockettavern"
    compileSdk = 36
    ndkVersion = "28.2.13676358"
    defaultConfig {
        applicationId = "app.pockettavern"
        minSdk = 29
        targetSdk = 36
        versionCode = 2
        versionName = "0.0.2-step2"
        // ABIs are chosen by the splits block below (ndk.abiFilters conflicts with it);
        // CMake gets the same list so it only builds ABIs that libnode.so exists for.
        externalNativeBuild {
            cmake {
                arguments += "-DANDROID_STL=c++_shared"
                abiFilters += listOf("arm64-v8a", "x86_64")
            }
        }
    }
    // One APK per ABI: phones take arm64-v8a, emulators take x86_64.
    splits {
        abi {
            isEnable = true
            reset()
            include("arm64-v8a", "x86_64")
            isUniversalApk = false
        }
    }
    buildTypes {
        debug { applicationIdSuffix = ".debug" }
        release { isMinifyEnabled = false }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    externalNativeBuild { cmake { path = file("src/main/cpp/CMakeLists.txt"); version = "3.22.1" } }
    // Compress libnode.so in the APK (~120 MB per ABI uncompressed); Android extracts it on install.
    packaging { jniLibs.useLegacyPackaging = true }
    // The SillyTavern zip and its version stamp are generated at build time (see packSillyTavern).
    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("generated/sillytavern-assets"))
    // Store the (already deflated) zip as-is so the app can stream it and measure its length.
    androidResources { noCompress += "zip" }
}

kotlin { compilerOptions { jvmTarget.set(JvmTarget.JVM_17) } }

// Download the pinned Node runtime, verify its SHA-256, and unpack libnode.so + headers.
val runtimeProps = Properties().apply { rootProject.file("node-runtime.properties").inputStream().use { load(it) } }
val runtimeZip = layout.buildDirectory.file("node-runtime/runtime-${runtimeProps.getProperty("version")}.zip")
val jniLibsDir = file("src/main/jniLibs")
val nodeIncludeDir = file("src/main/cpp/node-include")
val licensesDir = file("src/main/assets/licenses") // Node's license ships inside the APK

val fetchNodeRuntime by tasks.registering {
    description = "Downloads the pinned Node runtime and checks its SHA-256."
    val url = runtimeProps.getProperty("url")
    val expected = runtimeProps.getProperty("sha256").lowercase()
    inputs.property("url", url)
    inputs.property("sha256", expected)
    outputs.file(runtimeZip)
    doLast {
        val zip = runtimeZip.get().asFile
        fun sha256(f: File): String {
            val md = MessageDigest.getInstance("SHA-256")
            f.inputStream().use { s -> val buf = ByteArray(1 shl 16); while (true) { val n = s.read(buf); if (n < 0) break; md.update(buf, 0, n) } }
            return md.digest().joinToString("") { "%02x".format(it) }
        }
        if (!zip.exists() || sha256(zip) != expected) {
            zip.parentFile.mkdirs()
            logger.lifecycle("Downloading Node runtime from $url")
            URI(url).toURL().openStream().use { input -> zip.outputStream().use { input.copyTo(it) } }
        }
        val actual = sha256(zip)
        if (actual != expected) {
            zip.delete()
            throw GradleException("Node runtime checksum mismatch: expected $expected, got $actual")
        }
    }
}

val unpackNodeRuntime by tasks.registering(Copy::class) {
    description = "Unpacks libnode.so per ABI into jniLibs and the Node headers into cpp/node-include."
    dependsOn(fetchNodeRuntime)
    from(zipTree(runtimeZip)) {
        include("libraries/arm64-v8a/libnode.so", "libraries/x86_64/libnode.so", "libraries/Node-22-LICENSE", "headers/**")
        eachFile {
            path = when {
                path == "libraries/Node-22-LICENSE" -> "licenses/Node-22-LICENSE.txt"
                path.startsWith("libraries/") -> "jniLibs/" + path.removePrefix("libraries/")
                else -> "node-include/" + path.removePrefix("headers/")
            }
        }
        includeEmptyDirs = false
    }
    into(layout.buildDirectory.dir("node-runtime/unpacked"))
    outputs.dirs(jniLibsDir, nodeIncludeDir, licensesDir)
    doLast {
        val root = layout.buildDirectory.dir("node-runtime/unpacked").get().asFile
        jniLibsDir.deleteRecursively(); nodeIncludeDir.deleteRecursively()
        File(root, "jniLibs").copyRecursively(jniLibsDir)
        File(root, "node-include").copyRecursively(nodeIncludeDir)
        File(root, "licenses").copyRecursively(licensesDir, overwrite = true)
    }
}

tasks.named("preBuild") { dependsOn(unpackNodeRuntime) }
tasks.configureEach {
    if (name.startsWith("configureCMake") || name.startsWith("buildCMake") || name.startsWith("generateJsonModel")) {
        dependsOn(unpackNodeRuntime)
    }
}

// ---- SillyTavern (unmodified), bundled as assets/engine/sillytavern.zip ----
// prepare-sillytavern.mjs fetches the pinned commit and runs `npm ci --omit=dev` (needs git, node, npm).
val stProps = Properties().apply { rootProject.file("sillytavern.properties").inputStream().use { load(it) } }
val stPrepared = layout.buildDirectory.dir("sillytavern/prepared")
val stAssets = layout.buildDirectory.dir("generated/sillytavern-assets")

val prepareSillyTavern by tasks.registering(Exec::class) {
    description = "Fetches the pinned SillyTavern commit and installs its production dependencies."
    val script = rootProject.file("scripts/prepare-sillytavern.mjs")
    val props = rootProject.file("sillytavern.properties")
    inputs.files(script, props)
    outputs.dir(stPrepared)
    workingDir = rootProject.projectDir
    commandLine("node", script.absolutePath, props.absolutePath, stPrepared.get().asFile.absolutePath)
}

val zipSillyTavern by tasks.registering(Zip::class) {
    description = "Zips the prepared SillyTavern tree for the APK's assets."
    dependsOn(prepareSillyTavern)
    from(stPrepared) { exclude(".pocket-prepared") }
    archiveFileName.set("sillytavern.zip")
    destinationDirectory.set(stAssets.map { it.dir("engine") })
    isPreserveFileTimestamps = false
    isReproducibleFileOrder = true
    isZip64 = true
}

val stampSillyTavern by tasks.registering {
    description = "Writes engine/sillytavern.version (version + zip SHA-256); the app re-unpacks when it changes."
    dependsOn(zipSillyTavern)
    val zip = zipSillyTavern.flatMap { it.archiveFile }
    val stamp = stAssets.map { it.file("engine/sillytavern.version") }
    val version = stProps.getProperty("version")
    inputs.file(zip)
    outputs.file(stamp)
    doLast {
        val md = MessageDigest.getInstance("SHA-256")
        zip.get().asFile.inputStream().use { s -> val buf = ByteArray(1 shl 16); while (true) { val n = s.read(buf); if (n < 0) break; md.update(buf, 0, n) } }
        val hash = md.digest().joinToString("") { "%02x".format(it) }
        stamp.get().asFile.writeText("$version $hash\n")
    }
}

tasks.named("preBuild") { dependsOn(stampSillyTavern) }
tasks.configureEach {
    if (name.startsWith("merge") && name.endsWith("Assets")) dependsOn(stampSillyTavern)
}
