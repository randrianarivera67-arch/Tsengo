package com.tsengo.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.Person;
import androidx.core.app.RemoteInput;
import androidx.core.graphics.drawable.IconCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;

/**
 * Notifications façon Messenger : avatar rond, actions Répondre/Fermer/Voir.
 * Reçoit des messages DATA-ONLY (le backend n'envoie plus de bloc "notification"
 * pour le natif), donc onMessageReceived est appelé même app fermée.
 */
public class TrengoMessagingService extends FirebaseMessagingService {

    public static final String CHANNEL_ID = "trengo_default";
    public static final String KEY_REPLY = "key_reply";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        if (data == null || data.isEmpty()) return;

        try {
            String type = get(data, "type", "general");
            String title = get(data, "title", "Trengo");
            String body = get(data, "body", "");
            String iconUrl = get(data, "icon", "");
            String url = get(data, "url", "");
            String conversationId = get(data, "conversationId", "");
            String meUid = get(data, "meUid", "");
            String otherUid = get(data, "otherUid", "");
            String ns = get(data, "ns", "");
            boolean canReply = "1".equals(get(data, "canReply", ""));

            ensureChannel();

            int notifId = Math.abs((conversationId + "|" + type).hashCode());
            Bitmap avatar = loadBitmap(iconUrl);

            // Tap → ouvre l'app (MainActivity) avec l'URL cible
            Intent openIntent = new Intent(this, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            openIntent.putExtra("trengo_url", url);
            PendingIntent openPI = PendingIntent.getActivity(this, notifId, openIntent, piFlags(false));

            NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setSmallIcon(R.drawable.ic_stat_trengo)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setAutoCancel(true)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setDefaults(NotificationCompat.DEFAULT_ALL)
                    .setContentIntent(openPI);

            if (avatar != null) b.setLargeIcon(avatar);

            if (canReply) {
                // Style Messenger : avatar rond + bulle
                Person.Builder pb = new Person.Builder().setName(title);
                if (avatar != null) pb.setIcon(IconCompat.createWithBitmap(avatar));
                Person sender = pb.build();
                NotificationCompat.MessagingStyle style =
                        new NotificationCompat.MessagingStyle(new Person.Builder().setName("Moi").build());
                style.addMessage(body, System.currentTimeMillis(), sender);
                b.setStyle(style);

                // Répondre (saisie directe)
                RemoteInput remoteInput = new RemoteInput.Builder(KEY_REPLY)
                        .setLabel("Votre message...").build();
                Intent replyIntent = new Intent(this, NotificationReplyReceiver.class);
                replyIntent.setAction("TRENGO_REPLY");
                replyIntent.putExtra("conversationId", conversationId);
                replyIntent.putExtra("meUid", meUid);
                replyIntent.putExtra("otherUid", otherUid);
                replyIntent.putExtra("ns", ns);
                replyIntent.putExtra("notifId", notifId);
                PendingIntent replyPI = PendingIntent.getBroadcast(this, notifId, replyIntent, piFlags(true));
                NotificationCompat.Action reply = new NotificationCompat.Action.Builder(
                        R.drawable.ic_stat_trengo, "Répondre", replyPI)
                        .addRemoteInput(remoteInput)
                        .setAllowGeneratedReplies(true).build();
                b.addAction(reply);

                b.addAction(new NotificationCompat.Action.Builder(
                        R.drawable.ic_stat_trengo, "Fermer", closePI(notifId)).build());
            } else {
                b.addAction(new NotificationCompat.Action.Builder(
                        R.drawable.ic_stat_trengo, "Voir", openPI).build());
                b.addAction(new NotificationCompat.Action.Builder(
                        R.drawable.ic_stat_trengo, "Fermer", closePI(notifId)).build());
            }

            NotificationManagerCompat.from(this).notify(notifId, b.build());
        } catch (Exception e) {
            // ne jamais crasher sur une notif
        }
    }

    private PendingIntent closePI(int notifId) {
        Intent i = new Intent(this, NotificationReplyReceiver.class);
        i.setAction("TRENGO_CLOSE");
        i.putExtra("notifId", notifId);
        return PendingIntent.getBroadcast(this, notifId + 100000, i, piFlags(false));
    }

    private int piFlags(boolean mutable) {
        int base = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return base | (mutable ? PendingIntent.FLAG_MUTABLE : PendingIntent.FLAG_IMMUTABLE);
        }
        return base;
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && nm.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel ch = new NotificationChannel(
                        CHANNEL_ID, "Trengo", NotificationManager.IMPORTANCE_HIGH);
                ch.setDescription("Notifications Trengo");
                ch.enableVibration(true);
                ch.enableLights(true);
                nm.createNotificationChannel(ch);
            }
        }
    }

    private Bitmap loadBitmap(String urlStr) {
        if (urlStr == null || !urlStr.startsWith("http")) return null;
        HttpURLConnection conn = null;
        try {
            URL url = new URL(urlStr);
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(6000);
            conn.setReadTimeout(6000);
            conn.setDoInput(true);
            conn.connect();
            InputStream is = conn.getInputStream();
            Bitmap bmp = BitmapFactory.decodeStream(is);
            is.close();
            return bmp;
        } catch (Exception e) {
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private static String get(Map<String, String> m, String k, String def) {
        String v = m.get(k);
        return (v == null || v.isEmpty()) ? def : v;
    }
}
