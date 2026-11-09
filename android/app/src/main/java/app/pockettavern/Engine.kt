package app.pockettavern

import android.content.Context
import java.io.File

/** Shared constants and files for the engine (used by both the UI and the :runtime process). */
object Engine {
    const val PORT = 8123
    const val URL = "http://127.0.0.1:$PORT/"

    fun dir(context: Context) = File(context.filesDir, "engine").apply { mkdirs() }
    fun log(context: Context) = File(dir(context), "runtime.log")

    /** Copies the bundled script from assets to app-private storage and returns its path. */
    fun unpackScript(context: Context): File {
        val target = File(dir(context), "server.cjs")
        context.assets.open("engine/server.cjs").use { input ->
            target.outputStream().use { input.copyTo(it) }
        }
        return target
    }

    fun logTail(context: Context, maxChars: Int = 4000): String {
        val file = log(context)
        if (!file.exists()) return "(no log yet)"
        val text = file.readText()
        return if (text.length > maxChars) text.takeLast(maxChars) else text
    }
}
