package app.quote.note;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register before super so Capacitor sees the plugin at bridge init.
        registerPlugin(MlKitOcrPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
