package com.tsengo.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins natifs maison (a enregistrer AVANT super.onCreate)
        registerPlugin(TrengoDownloader.class);
        super.onCreate(savedInstanceState);
        tuneWebViewScroll();
        handleTrengoUrl(getIntent());
    }

    /**
     * Desactive l'effet de sur-defilement natif de la WebView (le "glow" bleu).
     *
     * Pourquoi c'est indispensable : quand l'utilisateur tire vers le bas alors
     * que la page est deja tout en haut, la WebView consomme le geste pour
     * dessiner son effet de sur-defilement et envoie un "touchcancel" au
     * JavaScript. Notre tirer-pour-actualiser voyait donc son geste annule en
     * plein milieu -> il fonctionnait sur le web mais jamais dans l'APK.
     * En le desactivant, les evenements tactiles arrivent intacts jusqu'au JS.
     */
    private void tuneWebViewScroll() {
        try {
            if (getBridge() == null) return;
            final WebView wv = getBridge().getWebView();
            if (wv == null) return;
            wv.post(new Runnable() {
                @Override
                public void run() {
                    try {
                        wv.setOverScrollMode(View.OVER_SCROLL_NEVER);
                        wv.getSettings().setOffscreenPreRaster(true); // defilement plus fluide
                    } catch (Exception ignored) {}
                }
            });
        } catch (Exception ignored) {}
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleTrengoUrl(intent);
    }

    // Ouvre la page ciblee (message/post/...) quand on tape la notification.
    private void handleTrengoUrl(Intent intent) {
        if (intent == null) return;
        final String url = intent.getStringExtra("trengo_url");
        if (url == null || url.isEmpty() || !url.startsWith("http")) return;
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().post(new Runnable() {
                    @Override
                    public void run() {
                        try { getBridge().getWebView().loadUrl(url); } catch (Exception ignored) {}
                    }
                });
            }
        } catch (Exception ignored) {}
    }
}
