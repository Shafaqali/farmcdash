package com.farmcare.app;

import android.content.Context;
import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import android.util.Base64;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Device-only capability, encrypted by AndroidKeyStore and excluded from backup.
 * Auth access/refresh tokens and farm financial data never enter this store. */
final class BackgroundNoticeStore {
    static final Object LOCK = new Object();
    private static final String KEY = "farmcare.background-notices.v1";
    private static AtomicFile file(Context context) {
        return new AtomicFile(new File(context.getNoBackupFilesDir(), "background-notices.enc"));
    }
    private static SecretKey key() throws Exception {
        if (Build.VERSION.SDK_INT < 23) throw new IllegalStateException("Android 6 or newer required");
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (store.containsAlias(KEY)) return (SecretKey) store.getKey(KEY, null);
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(KEY, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
        return generator.generateKey();
    }
    static JSONObject load(Context context) throws Exception {
        if (!file(context).getBaseFile().exists()) return null;
        JSONObject envelope = new JSONObject(new String(file(context).readFully(), StandardCharsets.UTF_8));
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(envelope.getString("iv"), Base64.NO_WRAP)));
        return new JSONObject(new String(cipher.doFinal(Base64.decode(envelope.getString("data"), Base64.NO_WRAP)), StandardCharsets.UTF_8));
    }
    static void save(Context context, JSONObject config) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key());
        JSONObject envelope = new JSONObject();
        envelope.put("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP));
        envelope.put("data", Base64.encodeToString(cipher.doFinal(config.toString().getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP));
        AtomicFile target = file(context);
        FileOutputStream stream = target.startWrite();
        try { stream.write(envelope.toString().getBytes(StandardCharsets.UTF_8)); target.finishWrite(stream); }
        catch (Exception error) { target.failWrite(stream); throw error; }
    }
    static void clear(Context context) { file(context).delete(); }
}
