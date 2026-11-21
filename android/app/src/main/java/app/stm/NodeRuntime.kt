// The JNI declaration is adapted from RodneyCw1/SillyTavern-Android (AGPL-3.0),
// TavernService.kt (object NodeRuntime). Changes: package and library name.
package app.stm

/** In-process Node.js. [start] blocks until Node exits and can run only once per process. */
object NodeRuntime {
    init {
        System.loadLibrary("node")
        System.loadLibrary("stm_node")
    }

    external fun start(arguments: Array<String>, logPath: String): Int
}
