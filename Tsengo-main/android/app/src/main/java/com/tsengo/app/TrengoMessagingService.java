package com.tsengo.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Rect;
import android.graphics.RectF;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.Person;
import androidx.core.app.RemoteInput;
import androidx.core.content.LocusIdCompat;
import androidx.core.content.pm.ShortcutInfoCompat;
import androidx.core.content.pm.ShortcutManagerCompat;
import androidx.core.graphics.drawable.IconCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;

/**
 * Notifications facon Messenger :
 *  - section "Conversations" (shortcut long-lived + MessagingStyle + CATEGORY_MESSAGE)
 *  - avatar ROND (adaptive icon) + badge app en couleur (rendu par le systeme)
 *  - actions Repondre (saisie directe) / Fermer / Voir
 *  - petite icone = silhouette du logo Trengo, teintee avec la couleur de marque
 */
public class TrengoMessagingService extends FirebaseMessagingService {

    public static final String CHANNEL_MSG = "trengo_messages";
    public static final String CHANNEL_DEFAULT = "trengo_default";
    public static final String KEY_REPLY = "key_reply";
    private static final int BRAND_COLOR = Color.parseColor("#FF2D8D");

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        if (data == null || data.isEmpty()) return;

        final Context ctx = getApplicationContext();
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

            ensureChannels(ctx);

            int notifId = Math.abs((conversationId + "|" + type).hashCode());
            Bitmap avatar = circle(loadBitmap(iconUrl));

            Intent openIntent = new Intent(ctx, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            openIntent.putExtra("trengo_url", url);
            PendingIntent openPI = PendingIntent.getActivity(ctx, notifId, openIntent, piFlags(false));

            String channel = canReply ? CHANNEL_MSG : CHANNEL_DEFAULT;
            NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, channel)
                    .setSmallIcon(R.drawable.ic_stat_trengo)
                    .setColor(BRAND_COLOR)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setAutoCancel(true)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setDefaults(NotificationCompat.DEFAULT_ALL)
                    .setShowWhen(true)
                    .setWhen(System.currentTimeMillis())
                    .setContentIntent(openPI);

            if (avatar != null) b.setLargeIcon(avatar);

            if (canReply) {
                IconCompat personIcon = (avatar != null) ? IconCompat.createWithAdaptiveBitmap(avatar) : null;
                Person.Builder pb = new Person.Builder().setName(title).setKey(otherUid).setImportant(true);
                if (personIcon != null) pb.setIcon(personIcon);
                Person sender = pb.build();

                // Shortcut long-lived -> section "Conversations" + badge app colore
                String shortcutId = "conv_" + (conversationId.isEmpty() ? otherUid : conversationId);
                try {
                    Intent scIntent = new Intent(ctx, MainActivity.class);
                    scIntent.setAction(Intent.ACTION_VIEW);
                    scIntent.putExtra("trengo_url", url);
                    ShortcutInfoCompat.Builder sb = new ShortcutInfoCompat.Builder(ctx, shortcutId)
                            .setLocusId(new LocusIdCompat(shortcutId))
                            .setShortLabel(title.isEmpty() ? "Trengo" : title)
                            .setLongLived(true)
                            .setPerson(sender)
                            .setIntent(scIntent);
                    if (personIcon != null) sb.setIcon(personIcon);
                    ShortcutManagerCompat.pushDynamicShortcut(ctx, sb.build());
                    b.setShortcutId(shortcutId);
                    b.setLocusId(new LocusIdCompat(shortcutId));
                } catch (Exception ignored) {}

                b.setCategory(NotificationCompat.CATEGORY_MESSAGE);
                b.addPerson(sender);

                NotificationCompat.MessagingStyle style =
                        new NotificationCompat.MessagingStyle(new Person.Builder().setName("Moi").build());
                style.setGroupConversation(false);
                style.addMessage(body, System.currentTimeMillis(), sender);
                b.setStyle(style);

                RemoteInput remoteInput = new RemoteInput.Builder(KEY_REPLY)
                        .setLabel("Votre message...").build();
                Intent replyIntent = new Intent(ctx, NotificationReplyReceiver.class);
                replyIntent.setAction("TRENGO_REPLY");
                replyIntent.putExtra("conversationId", conversationId);
                replyIntent.putExtra("meUid", meUid);
                replyIntent.putExtra("otherUid", otherUid);
                replyIntent.putExtra("ns", ns);
                replyIntent.putExtra("notifId", notifId);
                PendingIntent replyPI = PendingIntent.getBroadcast(ctx, notifId, replyIntent, piFlags(true));
                b.addAction(new NotificationCompat.Action.Builder(
                        R.drawable.ic_stat_trengo, "Répondre", replyPI)
                        .addRemoteInput(remoteInput)
                        .setAllowGeneratedReplies(true)
                        .setSemanticAction(NotificationCompat.Action.SEMANTIC_ACTION_REPLY)
                        .setShowsUserInterface(false)
                        .build());
                b.addAction(new NotificationCompat.Action.Builder(
                        R.drawable.ic_stat_trengo, "Fermer", closePI(ctx, notifId))
                        .setSemanticAction(NotificationCompat.Action.SEMANTIC_ACTION_DELETE)
                        .setShowsUserInterface(false)
                        .build());
            } else {
                if (body != null && body.length() > 48) {
                    b.setStyle(new NotificationCompat.BigTextStyle().bigText(body));
                }
                b.addAction(new NotificationCompat.Action.Builder(
                        R.drawable.ic_stat_trengo, "Voir", openPI).build());
                b.addAction(new NotificationCompat.Action.Builder(
                        R.drawable.ic_stat_trengo, "Fermer", closePI(ctx, notifId))
                        .setSemanticAction(NotificationCompat.Action.SEMANTIC_ACTION_DELETE)
                        .setShowsUserInterface(false)
                        .build());
            }

            NotificationManagerCompat.from(ctx).notify(notifId, b.build());
        } catch (Exception e) {
            // ne jamais crasher sur une notif
        }
    }

    private PendingIntent closePI(Context ctx, int notifId) {
        Intent i = new Intent(ctx, NotificationReplyReceiver.class);
        i.setAction("TRENGO_CLOSE");
        i.putExtra("notifId", notifId);
        return PendingIntent.getBroadcast(ctx, notifId + 100000, i, piFlags(false));
    }

    private int piFlags(boolean mutable) {
        int base = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return base | (mutable ? PendingIntent.FLAG_MUTABLE : PendingIntent.FLAG_IMMUTABLE);
        }
        return base;
    }

    private void ensureChannels(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            if (nm.getNotificationChannel(CHANNEL_MSG) == null) {
                NotificationChannel ch = new NotificationChannel(
                        CHANNEL_MSG, "Messages", NotificationManager.IMPORTANCE_HIGH);
                ch.setDescription("Conversations Trengo");
                ch.enableVibration(true);
                ch.enableLights(true);
                ch.setLightColor(BRAND_COLOR);
                nm.createNotificationChannel(ch);
            }
            if (nm.getNotificationChannel(CHANNEL_DEFAULT) == null) {
                NotificationChannel ch = new NotificationChannel(
                        CHANNEL_DEFAULT, "Notifications", NotificationManager.IMPORTANCE_HIGH);
                ch.setDescription("Reactions, commentaires, amis...");
                ch.enableVibration(true);
                ch.enableLights(true);
                ch.setLightColor(BRAND_COLOR);
                nm.createNotificationChannel(ch);
            }
        }
    }

    /** Recadre le bitmap en cercle (avatar rond comme Messenger). */
    private Bitmap circle(Bitmap src) {
        if (src == null) return null;
        try {
            int size = Math.min(src.getWidth(), src.getHeight());
            int x = (src.getWidth() - size) / 2;
            int y = (src.getHeight() - size) / 2;
            Bitmap sq = Bitmap.createBitmap(src, x, y, size, size);
            Bitmap out = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
            Canvas c = new Canvas(out);
            Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
            RectF rect = new RectF(0, 0, size, size);
            c.drawOval(rect, p);
            p.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.SRC_IN));
            c.drawBitmap(sq, new Rect(0, 0, size, size), new Rect(0, 0, size, size), p);
            return out;
        } catch (Exception e) {
            return src;
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
            conn.setInstanceFollowRedirects(true);
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
