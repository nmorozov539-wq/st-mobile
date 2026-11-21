package app.stm

import android.content.Context
import java.io.File
import java.io.FilterInputStream
import java.io.InputStream
import java.util.zip.ZipInputStream

/**
 * Shared constants and files for the engine (used by both the UI and the :runtime process).
 *
 * Layout under the app's private files directory:
 *   engine/sillytavern/   unmodified SillyTavern + node_modules, replaced when the bundled zip changes
 *   engine/home/          config.yaml and data/ (characters, chats, settings): kept across updates
 *   engine/runtime.log    Node's stdout/stderr (plus one capped rotated file)
 *   engine/state          one line written by the :runtime process, read by the UI
 */
object Engine {
    const val PORT = 8123
    const val URL = "http://127.0.0.1:$PORT/"
    private const val ZIP_ASSET = "engine/sillytavern.zip"
    private const val VERSION_ASSET = "engine/sillytavern.version"

    fun dir(context: Context) = File(context.filesDir, "engine").apply { mkdirs() }
    fun log(context: Context) = File(dir(context), "runtime.log")
    fun sillyTavernDir(context: Context) = File(dir(context), "sillytavern")
    fun homeDir(context: Context) = File(dir(context), "home").apply { mkdirs() }
    private fun stateFile(context: Context) = File(dir(context), "state")
    private fun installedVersionFile(context: Context) = File(dir(context), "sillytavern.installed")

    // ---- state shared between processes (plain text, one line) ----

    fun writeState(context: Context, state: String) {
        val file = stateFile(context)
        val tmp = File(file.path + ".tmp")
        tmp.writeText(state)
        tmp.renameTo(file)
    }

    fun readState(context: Context): String =
        stateFile(context).takeIf { it.exists() }?.readText()?.trim().orEmpty()

    // ---- SillyTavern install ----

    fun bundledVersion(context: Context): String =
        context.assets.open(VERSION_ASSET).bufferedReader().use { it.readText().trim() }

    /**
     * Unpacks the bundled SillyTavern into [sillyTavernDir] unless the same build is already there.
     * Extracts to a temporary directory first and swaps it in, so an interrupted unpack never leaves
     * a half-written tree marked as installed. User data in [homeDir] is never touched.
     */
    fun installSillyTavern(context: Context, progress: (percent: Int) -> Unit) {
        val bundled = bundledVersion(context)
        val marker = installedVersionFile(context)
        val target = sillyTavernDir(context)
        if (target.isDirectory && marker.exists() && marker.readText().trim() == bundled) return

        val staging = File(dir(context), "sillytavern.unpacking").apply { deleteRecursively(); mkdirs() }
        val stagingRoot = staging.canonicalPath + File.separator
        val total = context.assets.openFd(ZIP_ASSET).use { it.length }.coerceAtLeast(1)
        var lastPercent = -1
        val buffer = ByteArray(1 shl 16)
        CountingStream(context.assets.open(ZIP_ASSET)).use { counted ->
            ZipInputStream(counted.buffered(1 shl 16)).use { zip ->
                while (true) {
                    val entry = zip.nextEntry ?: break
                    val out = File(staging, entry.name)
                    if (!out.canonicalPath.startsWith(stagingRoot)) error("Bad zip entry: ${entry.name}")
                    if (entry.isDirectory) {
                        out.mkdirs()
                    } else {
                        out.parentFile?.mkdirs()
                        out.outputStream().use { o ->
                            while (true) { val n = zip.read(buffer); if (n < 0) break; o.write(buffer, 0, n) }
                        }
                    }
                    val percent = (counted.count * 100 / total).toInt().coerceIn(0, 100)
                    if (percent != lastPercent) { lastPercent = percent; progress(percent) }
                }
            }
        }
        marker.delete()
        target.deleteRecursively()
        if (!staging.renameTo(target)) error("Could not move unpacked SillyTavern into place")
        marker.writeText(bundled)
    }

    fun logTail(context: Context, maxChars: Int = 4000): String {
        val file = log(context)
        if (!file.exists()) return "(no log yet)"
        val text = file.readText()
        return if (text.length > maxChars) text.takeLast(maxChars) else text
    }

    /** Last non-empty log line, without ANSI colour codes; shown as progress while ST starts. */
    fun lastLogLine(context: Context): String {
        val file = log(context)
        if (!file.exists()) return ""
        val tail = file.readText().takeLast(2000)
        return tail.replace(Regex("\u001B\\[[0-9;]*[A-Za-z]|\u001B\\][^\u0007]*\u0007"), "")
            .lines().map { it.trim() }.lastOrNull { it.isNotEmpty() && !it.startsWith("---") }
            .orEmpty().take(160)
    }

    private class CountingStream(input: InputStream) : FilterInputStream(input) {
        var count = 0L
            private set
        override fun read(): Int = super.read().also { if (it >= 0) count++ }
        override fun read(b: ByteArray, off: Int, len: Int): Int = super.read(b, off, len).also { if (it > 0) count += it }
        override fun skip(n: Long): Long = super.skip(n).also { count += it }
    }
}
