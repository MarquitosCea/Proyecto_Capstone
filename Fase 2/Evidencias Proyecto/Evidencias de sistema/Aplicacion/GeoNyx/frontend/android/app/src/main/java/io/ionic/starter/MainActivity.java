package io.ionic.starter;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Evita que Android 15/16 pinte la barra de estado en blanco (edge-to-edge).
    WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    getWindow().setStatusBarColor(0xFF2A2D31);
    getWindow().setNavigationBarColor(0xFF2A2D31);
  }
}
