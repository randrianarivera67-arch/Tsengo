package com.tsengo.app;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.RemoteInput;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Gère l'action "Répondre" (saisie directe) et "Fermer" des notifications.
 * "Répondre" envoie le texte au backend /reply (même conversation).
 */
public class NotificationReplyReceiver extends BroadcastReceiver {

    private static final String BACKEND = "https://tsengo-backend.onrender.com";

    @Override
    public void onReceive(final Context context, Intent intent) {
        final int notifId = intent.getIntExtra("notifId", 0);
        final String action = intent.getAction();

        if ("TRENGO_CLOSE".equals(action)) {
            NotificationManagerCompat.from(context).cancel(notifId);
            return;
        }

        if (!"TRENGO_REPLY".equals(action)) return;

        Bundle remoteInput = RemoteInput.getResultsFromIntent(intent);
        CharSequence reply = remoteInput != null ? remoteInput.getCharSequence(TrengoMessagingService.KEY_REPLY) : null;
        final String text = reply != null ? reply.toString().trim() : "";

        final String conversationId = intent.getStringExtra("conversationId");
        final String meUid = intent.getStringExtra("meUid");
        final String otherUid = intent.getStringExtra("otherUid");
        final String ns = intent.getStringExtra("ns");

        if (text.isEmpty() || conversationId == null || meUid == null) {
            NotificationManagerCompat.from(context).cancel(notifId);
            return;
        }

        final PendingResult pending = goAsync();
        new Thread(new Runnable() {
            @Override
            public void run() {
                HttpURLConnection conn = null;
                try {
                    JSONObject payload = new JSONObject();
                    payload.put("conversationId", conversationId);
                    payload.put("meUid", meUid);
                    payload.put("otherUid", otherUid == null ? "" : otherUid);
                    payload.put("text", text);

                    URL url = new URL(BACKEND + "/reply");
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setConnectTimeout(8000);
                    conn.setReadTimeout(8000);
                    conn.setDoOutput(true);
                    conn.setRequestProperty("Content-Type", "application/json");
                    if (ns != null && !ns.isEmpty()) conn.setRequestProperty("x-notify-secret", ns);

                    OutputStream os = conn.getOutputStream();
                    os.write(payload.toString().getBytes("UTF-8"));
                    os.flush();
                    os.close();

                    conn.getResponseCode(); // déclenche l'envoi
                } catch (Exception e) {
                    // silencieux
                } finally {
                    if (conn != null) conn.disconnect();
                    try {
                        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                        if (nm != null) nm.cancel(notifId);
                    } catch (Exception ignored) {}
                    pending.finish();
                }
            }
        }).start();
    }
}
