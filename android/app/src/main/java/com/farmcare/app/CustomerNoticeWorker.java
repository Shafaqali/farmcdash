package com.farmcare.app;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/** Runs without a WebView/process being open. Android controls execution timing. */
public class CustomerNoticeWorker extends Worker {
    private static final Object POLL_LOCK = new Object();
    public CustomerNoticeWorker(@NonNull Context context, @NonNull WorkerParameters params) { super(context, params); }

    @NonNull @Override public Result doWork() {
        synchronized (POLL_LOCK) {
            JSONObject snapshot = null;
            try {
                synchronized (BackgroundNoticeStore.LOCK) { snapshot = BackgroundNoticeStore.load(getApplicationContext()); }
                if (snapshot == null || !snapshot.optBoolean("enabled")) return Result.success();
                if (!BackgroundNoticesPlugin.canNotify(getApplicationContext())) {
                    record(snapshot, "permission_blocked"); return Result.success();
                }
                BackgroundNoticesPlugin.createChannel(getApplicationContext());
                // Bounded batches catch up without keeping the phone awake indefinitely.
                for (int batch = 0; batch < 4 && !isStopped(); batch++) {
                    JSONArray notices = new JSONArray(request(snapshot, "poll_customer_notifications", credential(snapshot)));
                    JSONArray delivered = new JSONArray();
                    for (int index = 0; index < notices.length(); index++) {
                        JSONObject notice = notices.getJSONObject(index);
                        synchronized (BackgroundNoticeStore.LOCK) {
                            if (isStopped() || !isCurrent(snapshot)) return Result.success();
                            if (!BackgroundNoticesPlugin.canNotify(getApplicationContext())) {
                                record(snapshot, "permission_blocked"); return Result.success();
                            }
                            post(snapshot, notice);
                            delivered.put(notice.getString("id"));
                        }
                    }
                    if (delivered.length() > 0) request(snapshot, "ack_customer_notifications", credential(snapshot).put("_ids", delivered));
                    if (notices.length() < 30) break;
                }
                record(snapshot, "ok"); return Result.success();
            } catch (Expired error) {
                if (snapshot != null) {
                    synchronized (BackgroundNoticeStore.LOCK) {
                        try {
                            if (isCurrent(snapshot)) {
                                JSONObject current = BackgroundNoticeStore.load(getApplicationContext());
                                current.put("enabled", false).put("result", "sign_in_required");
                                BackgroundNoticeStore.save(getApplicationContext(), current);
                            }
                        } catch (Exception ignored) { }
                    }
                }
                return Result.success();
            } catch (Exception error) {
                if (snapshot != null) record(snapshot, "retrying");
                // Never log credentials or server response bodies.
                return Result.retry();
            }
        }
    }
    private boolean isCurrent(JSONObject snapshot) throws Exception {
        JSONObject current = BackgroundNoticeStore.load(getApplicationContext());
        return current != null && current.optBoolean("enabled") && current.optString("device").equals(snapshot.getString("device"));
    }
    private void record(JSONObject snapshot, String result) {
        synchronized (BackgroundNoticeStore.LOCK) {
            try {
                if (!isCurrent(snapshot)) return;
                JSONObject current = BackgroundNoticeStore.load(getApplicationContext());
                current.put("lastCheck", System.currentTimeMillis()).put("result", result);
                BackgroundNoticeStore.save(getApplicationContext(), current);
            } catch (Exception ignored) { }
        }
    }
    private JSONObject credential(JSONObject config) throws Exception {
        return new JSONObject().put("_device", config.getString("device")).put("_secret", config.getString("secret"));
    }
    private String request(JSONObject config, String rpc, JSONObject body) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(config.getString("url") + "/rest/v1/rpc/" + rpc).openConnection();
        try {
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(15000); connection.setReadTimeout(15000);
            connection.setRequestMethod("POST"); connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json");
            String key = config.getString("key");
            connection.setRequestProperty("apikey", key);
            if (!key.startsWith("sb_")) connection.setRequestProperty("Authorization", "Bearer " + key);
            byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
            connection.setFixedLengthStreamingMode(bytes.length);
            try (java.io.OutputStream output = connection.getOutputStream()) { output.write(bytes); }
            int status = connection.getResponseCode();
            InputStream input = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            if (input != null) try (InputStream stream = input) {
                byte[] buffer = new byte[4096]; int count;
                while ((count = stream.read(buffer)) != -1) {
                    if (output.size() + count > 65536) throw new IllegalStateException("Response too large");
                    output.write(buffer, 0, count);
                }
            }
            String response = new String(output.toByteArray(), StandardCharsets.UTF_8);
            if (status >= 400) {
                if (response.contains("\"28000\"")) throw new Expired();
                throw new IllegalStateException("Background request failed: " + status);
            }
            return response;
        } finally { connection.disconnect(); }
    }
    private void post(JSONObject config, JSONObject notice) throws Exception {
        if (android.os.Build.VERSION.SDK_INT >= 33 && androidx.core.content.ContextCompat.checkSelfPermission(
            getApplicationContext(), android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            throw new SecurityException("Notification permission was revoked");
        }
        Intent intent = new Intent(getApplicationContext(), MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent tap = PendingIntent.getActivity(getApplicationContext(), 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(getApplicationContext(), BackgroundNoticesPlugin.CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_farm).setContentTitle(notice.getString("title"))
            .setContentText(notice.getString("body")).setContentIntent(tap).setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH).setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setOnlyAlertOnce(true);
        // The stable UUID tag replaces a retry after a crash instead of adding a second receipt/notice.
        NotificationManagerCompat.from(getApplicationContext()).notify("customer:" + config.getString("uid") + ":" + notice.getString("id"), 20000, builder.build());
    }
    private static final class Expired extends Exception { }
}
