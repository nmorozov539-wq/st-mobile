// Structure adapted from RodneyCw1/SillyTavern-Android (AGPL-3.0), TavernService.kt:
// a foreground service in the ":runtime" process that runs Node on its own thread
// and kills the process on destroy. Rewritten for this spike (no updates, token,
// polling, or generation notifications).
package app.pockettavern

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Process
import android.util.Log

class EngineService : Service() {
    private var started = false

    override fun onBind(intent: Intent?) = null

    override fun onCreate() {
        super.onCreate()
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL, "Engine status", NotificationManager.IMPORTANCE_LOW)
        )
        val notification = notification()
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }
        if (!started) {
            started = true
            Thread({ runNode() }, "PocketTavern-Node").start()
        }
        // Auto-restart after a crash comes in a later step.
        return START_NOT_STICKY
    }

    private fun runNode() {
        val log = Engine.log(this)
        try {
            val script = Engine.unpackScript(this)
            log.appendText("\n--- engine start ${java.util.Date()} pid=${Process.myPid()} ---\n")
            val exit = NodeRuntime.start(
                arrayOf("node", script.absolutePath, Engine.PORT.toString()),
                log.absolutePath,
            )
            log.appendText("--- engine exited with code $exit ---\n")
        } catch (error: Throwable) {
            Log.e(TAG, "Engine failed", error)
            log.appendText("--- engine failed: $error ---\n")
        }
        // Node cannot be restarted in this process, so end the service (and the process).
        stopSelf()
    }

    private fun notification(): Notification {
        val open = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val stop = PendingIntent.getService(
            this, 1, Intent(this, EngineService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        return Notification.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_engine)
            .setContentTitle("Pocket Tavern engine running")
            .setContentText("Node is serving on 127.0.0.1:${Engine.PORT}")
            .setContentIntent(open)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .addAction(Notification.Action.Builder(null, "Stop engine", stop).build())
            .build()
    }

    override fun onDestroy() {
        stopForeground(STOP_FOREGROUND_REMOVE)
        super.onDestroy()
        // Node can only start once per process; end the :runtime process so the next start is clean.
        Process.killProcess(Process.myPid())
    }

    companion object {
        private const val TAG = "PocketTavernEngine"
        private const val CHANNEL = "engine"
        private const val NOTIFICATION_ID = 1001
        const val ACTION_STOP = "app.pockettavern.STOP_ENGINE"
    }
}
