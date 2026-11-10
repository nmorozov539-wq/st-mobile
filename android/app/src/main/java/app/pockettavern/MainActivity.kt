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
            webViewClient = WebViewClient()
            setBackgroundColor(background)
            visibility = View.GONE
        }
        val buttons = LinearLayout(this).apply {
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

    /** Starts (or re-attaches to) the engine service, then polls until the port answers. */
    private fun startEngine() {
        startForegroundService(Intent(this, EngineService::class.java))
        showStatus("Starting…")
        val generation = ++pollGeneration
        val deadline = System.currentTimeMillis() + 30_000
        io.execute {
            while (generation == pollGeneration) {
                if (answers()) {
                    main.post { if (generation == pollGeneration) showPage() }
                    return@execute
                }
                if (System.currentTimeMillis() > deadline) {
                    val tail = Engine.logTail(this)
                    main.post {
                        if (generation == pollGeneration) {
                            showStatus("The engine did not answer within 30 s.\n\nEngine log:\n$tail")
                        }
                    }
                    return@execute
                }
                Thread.sleep(200)
            }
        }
    }

    private fun stopEngine() {
        pollGeneration++
        startService(Intent(this, EngineService::class.java).setAction(EngineService.ACTION_STOP))
        finishAndRemoveTask()
    }

    private fun answers(): Boolean = try {
        val connection = URL(Engine.URL + "status").openConnection() as HttpURLConnection
        connection.connectTimeout = 500
        connection.readTimeout = 1000
        try { connection.responseCode == 200 } finally { connection.disconnect() }
    } catch (_: Exception) {
        false
    }

    private fun showStatus(message: String) {
        status.text = message
        status.gravity = if (message.length < 40) Gravity.CENTER else Gravity.START
        statusScroll.visibility = View.VISIBLE
        web.visibility = View.GONE
    }

    private fun showPage() {
        statusScroll.visibility = View.GONE
        web.visibility = View.VISIBLE
        web.loadUrl(Engine.URL)
    }

    override fun onDestroy() {
        pollGeneration++
        io.shutdownNow()
        web.destroy()
        super.onDestroy()
    }
}
