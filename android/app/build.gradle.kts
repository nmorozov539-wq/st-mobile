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
        versionCode = 1
        versionName = "0.0.1-spike"
        ndk { abiFilters += listOf("arm64-v8a", "x86_64") }
        externalNativeBuild { cmake { arguments += "-DANDROID_STL=c++_shared" } }
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
