package com.tsengo.app;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleTrengoUrl(getIntent());
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleTrengoUrl(intent);
    }

    // Ouvre la page ciblée (message/post/...) quand on tape la notification.
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
