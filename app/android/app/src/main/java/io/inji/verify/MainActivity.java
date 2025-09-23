package io.inji.verify;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.getcapacitor.BridgeActivity;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.button.MaterialButtonToggleGroup;
import com.google.android.material.card.MaterialCardView;
import com.google.android.material.chip.Chip;
import com.google.android.material.floatingactionbutton.FloatingActionButton;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    
    // UI Components
    private MaterialButtonToggleGroup modeToggleGroup;
    private MaterialButtonToggleGroup roleToggleGroup;
    private MaterialCardView qrScannerCard;
    private MaterialCardView bleVerificationCard;
    private MaterialCardView resultCard;
    private RecyclerView logsRecycler;
    
    private MaterialButton scanButton;
    private MaterialButton bleActionButton;
    private MaterialButton faceMatchToggle;
    private MaterialButton syncButton;
    private MaterialButton exportButton;
    
    private TextView statusText;
    private TextView bleStatusText;
    private TextView resultText;
    private TextView logsCount;
    
    private ImageView bleStatusIcon;
    private ImageView resultIcon;
    
    private Chip syncStatusChip;
    private FloatingActionButton fabSettings;
    
    // State
    private boolean isScanning = false;
    private boolean isBLEActive = false;
    private boolean faceMatchEnabled = true;
    private String currentMode = "qr";
    private String currentRole = "verifier";
    
    // Data
    private List<VerificationLog> logs = new ArrayList<>();
    private LogsAdapter logsAdapter;
    
    // Permissions
    private static final int CAMERA_PERMISSION_REQUEST = 1001;
    private static final int BLUETOOTH_PERMISSION_REQUEST = 1002;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        initializeViews();
        setupClickListeners();
        setupRecyclerView();
        updateUI();
        
        // Request permissions
        requestPermissions();
    }
    
    private void initializeViews() {
        // Toggle Groups
        modeToggleGroup = findViewById(R.id.mode_toggle_group);
        roleToggleGroup = findViewById(R.id.role_toggle_group);
        
        // Cards
        qrScannerCard = findViewById(R.id.qr_scanner_card);
        bleVerificationCard = findViewById(R.id.ble_verification_card);
        resultCard = findViewById(R.id.result_card);
        
        // Buttons
        scanButton = findViewById(R.id.scan_button);
        bleActionButton = findViewById(R.id.ble_action_button);
        faceMatchToggle = findViewById(R.id.face_match_toggle);
        syncButton = findViewById(R.id.sync_button);
        exportButton = findViewById(R.id.export_button);
        fabSettings = findViewById(R.id.fab_settings);
        
        // Text Views
        statusText = findViewById(R.id.status_text);
        bleStatusText = findViewById(R.id.ble_status_text);
        resultText = findViewById(R.id.result_text);
        logsCount = findViewById(R.id.logs_count);
        
        // Image Views
        bleStatusIcon = findViewById(R.id.ble_status_icon);
        resultIcon = findViewById(R.id.result_icon);
        
        // Chips
        syncStatusChip = findViewById(R.id.sync_status_chip);
        
        // RecyclerView
        logsRecycler = findViewById(R.id.logs_recycler);
    }
    
    private void setupClickListeners() {
        // Mode Toggle
        modeToggleGroup.addOnButtonCheckedListener((group, checkedId, isChecked) -> {
            if (isChecked) {
                if (checkedId == R.id.qr_mode_button) {
                    currentMode = "qr";
                } else if (checkedId == R.id.ble_mode_button) {
                    currentMode = "ble";
                }
                updateUI();
            }
        });
        
        // Role Toggle
        roleToggleGroup.addOnButtonCheckedListener((group, checkedId, isChecked) -> {
            if (isChecked) {
                if (checkedId == R.id.wallet_role_button) {
                    currentRole = "wallet";
                } else if (checkedId == R.id.verifier_role_button) {
                    currentRole = "verifier";
                }
                updateBLEUI();
            }
        });
        
        // Scan Button
        scanButton.setOnClickListener(v -> {
            if (isScanning) {
                stopScanning();
            } else {
                startScanning();
            }
        });
        
        // BLE Action Button
        bleActionButton.setOnClickListener(v -> {
            if (isBLEActive) {
                stopBLEOperation();
            } else {
                startBLEOperation();
            }
        });
        
        // Face Match Toggle
        faceMatchToggle.setOnClickListener(v -> {
            faceMatchEnabled = !faceMatchEnabled;
            updateFaceMatchToggle();
        });
        
        // Sync Button
        syncButton.setOnClickListener(v -> syncLogs());
        
        // Export Button
        exportButton.setOnClickListener(v -> exportLogs());
        
        // Settings FAB
        fabSettings.setOnClickListener(v -> openSettings());
    }
    
    private void setupRecyclerView() {
        logsAdapter = new LogsAdapter(logs);
        logsRecycler.setLayoutManager(new LinearLayoutManager(this));
        logsRecycler.setAdapter(logsAdapter);
    }
    
    private void updateUI() {
        if ("qr".equals(currentMode)) {
            qrScannerCard.setVisibility(View.VISIBLE);
            bleVerificationCard.setVisibility(View.GONE);
            scanButton.setText(isScanning ? "Stop Scan" : "Start Scan");
        } else {
            qrScannerCard.setVisibility(View.GONE);
            bleVerificationCard.setVisibility(View.VISIBLE);
            updateBLEUI();
        }
        
        updateLogsCount();
    }
    
    private void updateBLEUI() {
        if ("wallet".equals(currentRole)) {
            bleActionButton.setText(isBLEActive ? "Stop Advertising" : "Start Advertising");
            bleStatusText.setText(isBLEActive ? "Advertising VC..." : "Ready to advertise");
        } else {
            bleActionButton.setText(isBLEActive ? "Stop Scanning" : "Start Scanning");
            bleStatusText.setText(isBLEActive ? "Scanning for VCs..." : "Ready to scan");
        }
        
        updateFaceMatchToggle();
    }
    
    private void updateFaceMatchToggle() {
        if (faceMatchEnabled) {
            faceMatchToggle.setText("Face Match: ON");
            faceMatchToggle.setIconResource(R.drawable.ic_face);
        } else {
            faceMatchToggle.setText("Face Match: OFF");
            faceMatchToggle.setIconResource(R.drawable.ic_face_off);
        }
    }
    
    private void updateLogsCount() {
        int count = logs.size();
        if (count == 0) {
            logsCount.setText("No logs yet");
        } else {
            logsCount.setText(count + " logs");
        }
    }
    
    private void startScanning() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) 
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, 
                new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_REQUEST);
            return;
        }
        
        isScanning = true;
        statusText.setText("Scanning QR code...");
        scanButton.setText("Stop Scan");
        
        // TODO: Implement actual QR scanning
        simulateQRScan();
    }
    
    private void stopScanning() {
        isScanning = false;
        statusText.setText("Ready to verify");
        scanButton.setText("Start Scan");
    }
    
    private void startBLEOperation() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH) 
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, 
                new String[]{Manifest.permission.BLUETOOTH}, BLUETOOTH_PERMISSION_REQUEST);
            return;
        }
        
        isBLEActive = true;
        bleStatusIcon.setImageResource(R.drawable.ic_bluetooth_connected);
        
        if ("wallet".equals(currentRole)) {
            bleStatusText.setText("Advertising VC...");
            bleActionButton.setText("Stop Advertising");
        } else {
            bleStatusText.setText("Scanning for VCs...");
            bleActionButton.setText("Stop Scanning");
        }
        
        // TODO: Implement actual BLE operations
        simulateBLEOperation();
    }
    
    private void stopBLEOperation() {
        isBLEActive = false;
        bleStatusIcon.setImageResource(R.drawable.ic_bluetooth_disconnected);
        bleStatusText.setText("Disconnected");
        bleActionButton.setText("wallet".equals(currentRole) ? "Start Advertising" : "Start Scanning");
    }
    
    private void simulateQRScan() {
        // Simulate QR scan result after 2 seconds
        new android.os.Handler().postDelayed(() -> {
            if (isScanning) {
                stopScanning();
                showVerificationResult(true, "QR Code verified successfully!");
            }
        }, 2000);
    }
    
    private void simulateBLEOperation() {
        // Simulate BLE operation result after 3 seconds
        new android.os.Handler().postDelayed(() -> {
            if (isBLEActive) {
                stopBLEOperation();
                showVerificationResult(true, "BLE verification successful!");
            }
        }, 3000);
    }
    
    private void showVerificationResult(boolean success, String message) {
        resultCard.setVisibility(View.VISIBLE);
        
        if (success) {
            resultIcon.setImageResource(R.drawable.ic_checkmark);
            resultText.setText(message);
            resultText.setTextColor(ContextCompat.getColor(this, R.color.verification_success));
        } else {
            resultIcon.setImageResource(R.drawable.ic_cross);
            resultText.setText(message);
            resultText.setTextColor(ContextCompat.getColor(this, R.color.verification_failure));
        }
        
        // Add to logs
        VerificationLog log = new VerificationLog(
            "hash_" + System.currentTimeMillis(),
            success ? "success" : "failure",
            System.currentTimeMillis(),
            false
        );
        logs.add(0, log);
        logsAdapter.notifyItemInserted(0);
        updateLogsCount();
    }
    
    private void syncLogs() {
        Toast.makeText(this, "Syncing logs...", Toast.LENGTH_SHORT).show();
        // TODO: Implement actual sync
    }
    
    private void exportLogs() {
        Toast.makeText(this, "Exporting logs...", Toast.LENGTH_SHORT).show();
        // TODO: Implement actual export
    }
    
    private void openSettings() {
        Toast.makeText(this, "Opening settings...", Toast.LENGTH_SHORT).show();
        // TODO: Implement settings activity
    }
    
    private void requestPermissions() {
        List<String> permissions = new ArrayList<>();
        
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) 
                != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.CAMERA);
        }
        
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH) 
                != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.BLUETOOTH);
        }
        
        if (!permissions.isEmpty()) {
            ActivityCompat.requestPermissions(this, 
                permissions.toArray(new String[0]), CAMERA_PERMISSION_REQUEST);
        }
    }
    
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, 
                                         @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == CAMERA_PERMISSION_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(this, "Camera permission granted", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(this, "Camera permission denied", Toast.LENGTH_SHORT).show();
            }
        }
        
        if (requestCode == BLUETOOTH_PERMISSION_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(this, "Bluetooth permission granted", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(this, "Bluetooth permission denied", Toast.LENGTH_SHORT).show();
            }
        }
    }
}
