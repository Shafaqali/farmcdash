package com.farmcare.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.service.notification.StatusBarNotification;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.*;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;
import java.net.URI;
import java.security.SecureRandom;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@CapacitorPlugin(name = "BackgroundNotices")
public class BackgroundNoticesPlugin extends Plugin {
    static final String PERIODIC = "customer-notice-poll";
    static final String IMMEDIATE = "customer-notice-check";
    static final String CHANNEL = "customer_updates";
    private static android.media.Ringtone foregroundTone;

    @PluginMethod public void openNotificationSettings(PluginCall call) {
        try {
            android.content.Intent intent = new android.content.Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                .putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
            if (Build.VERSION.SDK_INT < 26) intent = new android.content.Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                android.net.Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception error) { call.reject("Open Android app settings and allow notifications."); }
    }
    @PluginMethod public void ownerPermission(PluginCall call) {
        createSoundChannel(getContext(), "farm", "Farm alerts");
        boolean enabled = NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = getContext().getSystemService(NotificationManager.class).getNotificationChannel("farm");
            enabled = enabled && (channel == null || channel.getImportance() != NotificationManager.IMPORTANCE_NONE);
        }
        call.resolve(new JSObject().put("permission", enabled).put("sound", channelSound(getContext(), "farm")));
    }

    @PluginMethod public void playForegroundNotice(PluginCall call) {
        String uid = call.getString("uid", "");
        getActivity().runOnUiThread(() -> {
            synchronized (BackgroundNoticeStore.LOCK) {
                try {
                    JSONObject config = BackgroundNoticeStore.load(getContext());
                    if (config == null || !config.optBoolean("enabled") || !uid.equals(config.optString("uid"))
                        || !canNotify(getContext()) || !channelSound(getContext(), CHANNEL)) { call.resolve(); return; }
                    android.media.AudioManager audio = (android.media.AudioManager) getContext().getSystemService(android.content.Context.AUDIO_SERVICE);
                    if (audio.getRingerMode() != android.media.AudioManager.RINGER_MODE_NORMAL) { call.resolve(); return; }
                    if (Build.VERSION.SDK_INT >= 23 && getContext().getSystemService(NotificationManager.class).getCurrentInterruptionFilter() != NotificationManager.INTERRUPTION_FILTER_ALL) { call.resolve(); return; }
                    android.net.Uri sound = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION);
                    if (Build.VERSION.SDK_INT >= 26) sound = getContext().getSystemService(NotificationManager.class).getNotificationChannel(CHANNEL).getSound();
                    if (foregroundTone != null) foregroundTone.stop();
                    foregroundTone = android.media.RingtoneManager.getRingtone(getContext(), sound);
                    if (foregroundTone != null) {
                        foregroundTone.setAudioAttributes(new android.media.AudioAttributes.Builder().setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION).build());
                        foregroundTone.play();
                        android.media.Ringtone playing = foregroundTone;
                        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(playing::stop, 1200);
                    }
                    call.resolve();
                } catch (Exception error) { call.resolve(); }
            }
        });
    }

    @PluginMethod public void bindAccount(PluginCall call) {
        synchronized (BackgroundNoticeStore.LOCK) {
            try {
                JSONObject config = BackgroundNoticeStore.load(getContext());
                if (config != null && !config.optString("uid").equals(call.getString("uid", ""))) clearLocal(getContext());
                call.resolve();
            } catch (Exception error) { clearLocal(getContext()); call.resolve(); }
        }
    }

    @PluginMethod public void prepare(PluginCall call) {
        if (Build.VERSION.SDK_INT < 23) { call.reject("Background alerts require Android 6 or newer"); return; }
        String uid = call.getString("uid", "");
        try {
            UUID.fromString(uid);
            synchronized (BackgroundNoticeStore.LOCK) {
                JSONObject config;
                try { config = BackgroundNoticeStore.load(getContext()); }
                catch (Exception unreadable) { clearLocal(getContext()); config = null; }
                if (config == null || !uid.equals(config.optString("uid"))) {
                    clearLocal(getContext());
                    byte[] random = new byte[32]; new SecureRandom().nextBytes(random);
                    StringBuilder secret = new StringBuilder();
                    for (byte b : random) secret.append(String.format("%02x", b & 255));
                    config = new JSONObject().put("uid", uid).put("device", UUID.randomUUID().toString())
                        .put("secret", secret.toString()).put("enabled", false);
                    BackgroundNoticeStore.save(getContext(), config);
                }
                call.resolve(new JSObject().put("device", config.getString("device")).put("secret", config.getString("secret")));
            }
        } catch (Exception error) { call.reject("Could not prepare background notifications"); }
    }

    @PluginMethod public void activate(PluginCall call) {
        try {
            URI url = new URI(call.getString("url", ""));
            if (!"https".equals(url.getScheme()) || url.getHost() == null || url.getRawUserInfo() != null
                || url.getRawQuery() != null || url.getRawFragment() != null || !(url.getPath().isEmpty() || "/".equals(url.getPath()))) {
                call.reject("Invalid background service address"); return;
            }
            createChannel(getContext());
            if (!canNotify(getContext())) { call.reject("Allow phone notifications and Customer updates channel first"); return; }
            synchronized (BackgroundNoticeStore.LOCK) {
                JSONObject config = BackgroundNoticeStore.load(getContext());
                if (config == null || !config.getString("device").equals(call.getString("device"))) { call.reject("Account changed; try again"); return; }
                config.put("url", url.toString().replaceAll("/$", "")).put("key", call.getString("key", "")).put("enabled", true);
                BackgroundNoticeStore.save(getContext(), config);
                createChannel(getContext());
                Constraints constraints = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
                PeriodicWorkRequest periodic = new PeriodicWorkRequest.Builder(CustomerNoticeWorker.class, 15, TimeUnit.MINUTES)
                    .setConstraints(constraints).setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build();
                WorkManager.getInstance(getContext()).enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP, periodic);
                enqueueCheck(getContext());
            }
            call.resolve();
        } catch (Exception error) { call.reject("Could not enable background notifications"); }
    }

    @PluginMethod public void checkNow(PluginCall call) {
        synchronized (BackgroundNoticeStore.LOCK) {
            try {
                JSONObject config = BackgroundNoticeStore.load(getContext());
                if (config == null || !config.optBoolean("enabled")) { call.reject("Enable background alerts first"); return; }
                enqueueCheck(getContext()); call.resolve();
            } catch (Exception error) { call.reject("Could not check notifications"); }
        }
    }
    @PluginMethod public void status(PluginCall call) {
        synchronized (BackgroundNoticeStore.LOCK) {
            try {
                JSONObject config = BackgroundNoticeStore.load(getContext());
                call.resolve(new JSObject().put("enabled", config != null && config.optBoolean("enabled"))
                    .put("permission", canNotify(getContext())).put("sound", channelSound(getContext(), CHANNEL))
                    .put("backgroundRestricted", Build.VERSION.SDK_INT >= 28 && getContext().getSystemService(android.app.ActivityManager.class).isBackgroundRestricted())
                    .put("lastCheck", config == null ? 0 : config.optLong("lastCheck"))
                    .put("result", config == null ? "" : config.optString("result")));
            } catch (Exception error) { call.reject("Could not read notification status"); }
        }
    }
    @PluginMethod public void openBackgroundSettings(PluginCall call) {
        try {
            android.content.Intent intent = new android.content.Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                android.net.Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent); call.resolve();
        } catch (Exception error) { call.reject("Open Android app settings to allow background battery use"); }
    }
    @PluginMethod public void stop(PluginCall call) {
        synchronized (BackgroundNoticeStore.LOCK) { clearLocal(getContext()); }
        call.resolve();
    }
    static void enqueueCheck(android.content.Context context) {
        OneTimeWorkRequest check = new OneTimeWorkRequest.Builder(CustomerNoticeWorker.class)
            .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build();
        WorkManager.getInstance(context).enqueueUniqueWork(IMMEDIATE, ExistingWorkPolicy.KEEP, check);
    }
    static void createChannel(android.content.Context context) {
        createSoundChannel(context, CHANNEL, "Customer animal and payment updates");
    }
    static void createSoundChannel(android.content.Context context, String id, String name) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            // Existing channels belong to the user: never reset a chosen silent mode.
            if (manager.getNotificationChannel(id) != null) return;
            NotificationChannel channel = new NotificationChannel(id, name, NotificationManager.IMPORTANCE_HIGH);
            channel.enableVibration(true);
            channel.setSound(android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION),
                new android.media.AudioAttributes.Builder().setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            manager.createNotificationChannel(channel);
        }
    }
    static boolean channelSound(android.content.Context context, String id) {
        if (Build.VERSION.SDK_INT < 26) return true;
        NotificationChannel channel = context.getSystemService(NotificationManager.class).getNotificationChannel(id);
        return channel == null || (channel.getSound() != null && channel.getImportance() >= NotificationManager.IMPORTANCE_DEFAULT);
    }
    static boolean canNotify(android.content.Context context) {
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return false;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = context.getSystemService(NotificationManager.class).getNotificationChannel(CHANNEL);
            return channel == null || channel.getImportance() != NotificationManager.IMPORTANCE_NONE;
        }
        return true;
    }
    static void clearLocal(android.content.Context context) {
        if (foregroundTone != null) { foregroundTone.stop(); foregroundTone = null; }
        BackgroundNoticeStore.clear(context);
        WorkManager.getInstance(context).cancelUniqueWork(PERIODIC);
        WorkManager.getInstance(context).cancelUniqueWork(IMMEDIATE);
        if (Build.VERSION.SDK_INT >= 23) {
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            for (StatusBarNotification n : manager.getActiveNotifications()) {
                if (n.getTag() != null && n.getTag().startsWith("customer:")) manager.cancel(n.getTag(), n.getId());
            }
        }
    }
}
