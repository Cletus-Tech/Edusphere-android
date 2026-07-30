package com.cletustech.edusphere;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // All Capacitor plugins (Camera, Share, PushNotifications, Filesystem,
        // Network, SplashScreen, StatusBar, App) are auto-registered here by
        // `npx cap sync android` — nothing to add manually.
    }
}
