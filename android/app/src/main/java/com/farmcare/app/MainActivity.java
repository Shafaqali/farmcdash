package com.farmcare.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(BackgroundNoticesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
