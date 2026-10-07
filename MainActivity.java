package io.github.wallabeasts.raretracker;

import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Rare Disease Tracker, as an Android app.
 *
 * The whole app (index.html and the language files) is packed inside this APK, under assets/.
 * Nothing is fetched from a website: it works with the phone in airplane mode, and the patient's
 * record never leaves the phone.
 *
 * The pages reach the WebView through WebViewAssetLoader, so they arrive over
 * https://appassets.androidplatform.net/ rather than file://. That matters: an https origin is a
 * "secure context", which the browser requires before handing the app the encryption
 * (crypto.subtle) and storage it uses to lock the record with the patient's password.
 */
public class MainActivity extends AppCompatActivity {

    private static final String DOMAIN = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + DOMAIN + "/assets/index.html";

    private WebView web;
    private ValueCallback<Uri[]> filePicker;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .setDomain(DOMAIN)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // localStorage: where the locked record is kept
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);           // nothing outside the packed assets
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setSupportMultipleWindows(false);

        web.setWebViewClient(new WebViewClientCompat() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                return loader.shouldInterceptRequest(req.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (u != null && DOMAIN.equals(u.getHost())) return false; // our own pages
                handOff(u);                                                // links and mailto: leave the app
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            // "Choose a backup file" and "Open a shared copy" need the phone's own file picker.
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (filePicker != null) filePicker.onReceiveValue(null);
                filePicker = cb;
                try {
                    startActivityForResult(params.createIntent(), 1);
                } catch (ActivityNotFoundException e) {
                    filePicker = null;
                    toast("No app on this phone can pick a file.");
                    return false;
                }
                return true;
            }
        });

        // Exports (backup .json, spreadsheet .csv) are saved through this, because a WebView has
        // no Downloads folder of its own. The page calls it when it is running inside this app.
        web.addJavascriptInterface(new Exporter(), "AndroidExport");

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (web.canGoBack()) web.goBack();
                else finish();
            }
        });

        if (saved != null) web.restoreState(saved);
        else web.loadUrl(START_URL);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != 1 || filePicker == null) return;
        filePicker.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
        filePicker = null;
    }

    private void handOff(Uri u) {
        if (u == null) return;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, u));
        } catch (ActivityNotFoundException e) {
            toast("No app on this phone can open that.");
        }
    }

    private void toast(String m) {
        Toast.makeText(this, m, Toast.LENGTH_LONG).show();
    }

    private class Exporter {
        /** Writes an exported backup or spreadsheet into the phone's Downloads folder. */
        @JavascriptInterface
        public void saveText(String text, String filename, String mime) {
            try {
                String name = (filename == null || filename.trim().isEmpty())
                        ? "rare-disease-tracker-export.json" : filename.trim();
                ContentValues v = new ContentValues();
                v.put(MediaStore.Downloads.DISPLAY_NAME, name);
                v.put(MediaStore.Downloads.MIME_TYPE,
                        (mime == null || mime.isEmpty()) ? "application/octet-stream" : mime);
                v.put(MediaStore.Downloads.IS_PENDING, 1);

                Uri item = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                if (item == null) throw new Exception("nowhere to save");
                try (OutputStream out = getContentResolver().openOutputStream(item)) {
                    if (out == null) throw new Exception("nowhere to save");
                    out.write(text.getBytes(StandardCharsets.UTF_8));
                }
                v.clear();
                v.put(MediaStore.Downloads.IS_PENDING, 0);
                getContentResolver().update(item, v, null, null);

                final String saved = name;
                runOnUiThread(() -> toast("Saved to Downloads: " + saved));
            } catch (Exception e) {
                runOnUiThread(() -> toast("That file couldn't be saved."));
            }
        }
    }
}
