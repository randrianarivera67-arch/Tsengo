package com.tsengo.app;

import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Environment;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Telechargement NATIF via le DownloadManager du systeme :
 *  - le fichier arrive VRAIMENT dans /Download (visible dans le gestionnaire)
 *  - notification de progression geree par Android
 *  - aucun backend, aucun probleme de CORS (requete native)
 */
@CapacitorPlugin(name = "TrengoDownloader")
public class TrengoDownloader extends Plugin {

    @PluginMethod
    public void download(PluginCall call) {
        String url = call.getString("url");
        String filename = call.getString("filename");
        String mime = call.getString("mime");

        if (url == null || url.isEmpty()) {
            call.reject("url manquante");
            return;
        }
        if (filename == null || filename.isEmpty()) {
            filename = "trengo_" + System.currentTimeMillis();
        }

        try {
            DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
            req.setTitle(filename);
            req.setDescription("Téléchargement Trengo");
            req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
            req.setAllowedOverMetered(true);
            req.setAllowedOverRoaming(true);
            if (mime != null && !mime.isEmpty()) req.setMimeType(mime);

            DownloadManager dm = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
            if (dm == null) { call.reject("DownloadManager indisponible"); return; }
            long id = dm.enqueue(req);

            JSObject ret = new JSObject();
            ret.put("id", id);
            ret.put("filename", filename);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("echec: " + e.getMessage());
        }
    }
}
