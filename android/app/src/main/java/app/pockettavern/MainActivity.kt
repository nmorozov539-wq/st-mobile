package app.pockettavern

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.net.Uri
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private val main = Handler(Looper.getMainLooper())
    private val io = Executors.newSingleThreadExecutor()
    private lateinit var status: TextView
    private lateinit var statusScroll: ScrollView
    private lateinit var web: WebView
    private lateinit var buttons: LinearLayout
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var pollGeneration = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val background = Color.rgb(0x16, 0x13, 0x0f)
        status = TextView(this).apply {
            setTextColor(Color.rgb(0xef, 0xe6, 0xd8))
            textSize = 16f
            gravity = Gravity.CENTER
            setPadding(48, 48, 48, 48)
            text = "Starting…"
        }
        statusScroll = ScrollView(this).apply {
            isFillViewport = true
            addView(status, MATCH_PARENT, WRAP_CONTENT)
        }
        web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true // SillyTavern keeps UI state in localStorage
            settings.databaseEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            webViewClient = object : WebViewClient() {
                // Keep SillyTavern inside the app; open any other link in the user's browser.
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    val uri = request.url
                    if (uri.host == "127.0.0.1" && uri.port == Engine.PORT) return false
                    try { startActivity(Intent(Intent.ACTION_VIEW, uri)) } catch (_: Exception) { }
                    return true
                }
            }
            webChromeClient = object : WebChromeClient() {
                // <input type="file"> (character / chat / world info import).
                override fun onShowFileChooser(
                    view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams,
                ): Boolean {
                    fileCallback?.onReceiveValue(null)
                    fileCallback = callback
                    return try {
                        startActivityForResult(params.createIntent(), REQUEST_FILE)
                        true
                    } catch (_: Exception) {
                        fileCallback = null
                        false
                    }
                }
            }
            setBackgroundColor(background)
            visibility = View.GONE
        }
        buttons = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            addView(Button(context).apply { text = "Reload"; setOnClickListener { startEngine() } },
                LinearLayout.LayoutParams(0, WRAP_CONTENT, 1f))
            addView(Button(context).apply { text = "Stop engine"; setOnClickListener { stopEngine() } },
                LinearLayout.LayoutParams(0, WRAP_CONTENT, 1f))
        }
        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(background)
            fitsSystemWindows = true
            addView(statusScroll, LinearLayout.LayoutParams(MATCH_PARENT, 0, 1f))
            addView(web, LinearLayout.LayoutParams(MATCH_PARENT, 0, 1f))
            addView(buttons, MATCH_PARENT, WRAP_CONTENT)
        })
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
        }
        startEngine()
    }

    /** Starts (or re-attaches to) the engine service, then polls until SillyTavern answers. */
    private fun startEngine() {
        val previous = Engine.readState(this)
        if (previous.isEmpty() || isTerminal(previous)) Engine.writeState(this, "launching")
        startForegroundService(Intent(this, EngineService::class.java))
        showStatus("Starting…")
        val generation = ++pollGeneration
        // First start unpacks SillyTavern and compiles its frontend libraries, which can take minutes.
        val deadline = System.currentTimeMillis() + 10 * 60_000
        io.execute {
            while (generation == pollGeneration) {
                if (answers()) {
                    main.post { if (generation == pollGeneration) showPage() }
                    return@execute
                }
                val state = Engine.readState(this)
                if (isTerminal(state) || System.currentTimeMillis() > deadline) {
                    val reason = if (isTerminal(state)) "The engine stopped ($state)." else "The engine did not answer within 10 minutes."
                    val tail = Engine.logTail(this)
                    main.post {
                        if (generation == pollGeneration) showStatus("$reason Tap Reload to try again.\n\nEngine log:\n$tail")
                    }
                    return@execute
                }
                val message = describe(state)
                main.post { if (generation == pollGeneration) showStatus(message) }
                Thread.sleep(300)
            }
        }
    }

    private fun isTerminal(state: String) = state.startsWith("exited") || state == "failed"

    private fun describe(state: String): String = when {
        state.startsWith("unpacking") ->
            "Setting up SillyTavern… ${state.removePrefix("unpacking").trim()}%\n\nThis happens once after install or update."
        state == "starting" -> {
            val line = Engine.lastLogLine(this)
            "Starting SillyTavern…\n\nThe first start compiles its frontend and can take a minute or two." +
                if (line.isNotEmpty()) "\n\n$line" else ""
        }
        else -> "Starting…"
    }

    private fun stopEngine() {
        pollGeneration++
        startService(Intent(this, EngineService::class.java).setAction(EngineService.ACTION_STOP))
        finishAndRemoveTask()
    }

    private fun answers(): Boolean = try {
        val connection = URL(Engine.URL).openConnection() as HttpURLConnection
        connection.connectTimeout = 500
        connection.readTimeout = 2000
        connection.instanceFollowRedirects = false
        try { connection.responseCode in 200..399 } finally { connection.disconnect() }
    } catch (_: Exception) {
        false
    }

    private fun showStatus(message: String) {
        status.text = message
        status.gravity = if (message.contains("Engine log:")) Gravity.START else Gravity.CENTER
        statusScroll.visibility = View.VISIBLE
        buttons.visibility = View.VISIBLE
        web.visibility = View.GONE
    }

    private fun showPage() {
        statusScroll.visibility = View.GONE
        // SillyTavern gets the whole screen; the engine can still be stopped from the notification.
        buttons.visibility = View.GONE
        web.visibility = View.VISIBLE
        if (web.url == null) web.loadUrl(Engine.URL) else web.reload()
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == REQUEST_FILE) {
            fileCallback?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data))
            fileCallback = null
            return
        }
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)
    }

    override fun onDestroy() {
        pollGeneration++
        io.shutdownNow()
        web.destroy()
        super.onDestroy()
    }

    private companion object {
        const val REQUEST_FILE = 42
    }
}
