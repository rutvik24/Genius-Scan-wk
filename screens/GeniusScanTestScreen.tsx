/**
 * Genius Scan SDK test screen.
 * Use this to verify: when the camera is opened and the user cancels, the flow stops correctly.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import GeniusScan from '@thegrizzlylabs/react-native-genius-scan';

type ScannerStatus =
  | 'idle'
  | 'opening'
  | 'open'
  | 'cancelled'
  | 'success'
  | 'error';

type LogEntry = {
  time: string;
  message: string;
  status?: ScannerStatus;
};

function formatTime(): string {
  const d = new Date();
  return d.toTimeString().slice(0, 12);
}

export default function GeniusScanTestScreen() {
  const colorScheme = useColorScheme();
  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const addLog = useCallback((message: string, newStatus?: ScannerStatus) => {
    const time = formatTime();
    setLogs(prev => [...prev, { time, message, status: newStatus }]);
    if (newStatus !== undefined) setStatus(newStatus);
  }, []);

  const startScanner = useCallback(async () => {
    setLastResult(null);
    setLastError(null);

    if (!GeniusScan) {
      addLog(
        'Native module not available. Rebuild the app (e.g. pod install on iOS).',
        'error',
      );
      setLastError(
        'RNGeniusScan native module is null. Rebuild the app after linking.',
      );
      return;
    }

    addLog('Opening scanner (camera)...', 'opening');

    try {
      const result = await GeniusScan.scanWithConfiguration({
        source: 'camera',
        multiPage: false,
      });
      addLog('Scanner resolved with result.', 'success');
      setLastResult(
        result?.multiPageDocumentUrl
          ? `Document: ${result.multiPageDocumentUrl}`
          : JSON.stringify(result, null, 2).slice(0, 500),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const isCancelled =
        message.toLowerCase().includes('cancel') ||
        message.toLowerCase().includes('user') ||
        message.toLowerCase().includes('dismiss');
      addLog(
        isCancelled ? 'User cancelled – scanner closed.' : `Error: ${message}`,
        isCancelled ? 'cancelled' : 'error',
      );
      setLastError(message);
    }
  }, [addLog]);

  const startBarcodeScanner = useCallback(
    async (batchMode: boolean = false) => {
      setLastResult(null);
      setLastError(null);

      if (!GeniusScan) {
        addLog(
          'Native module not available. Rebuild the app (e.g. pod install on iOS).',
          'error',
        );
        setLastError(
          'RNGeniusScan native module is null. Rebuild the app after linking.',
        );
        return;
      }

      addLog(
        `Opening barcode scanner (${batchMode ? 'batch' : 'standard'} mode)...`,
        'opening',
      );

      try {
        const result = await GeniusScan.scanReadableCodesWithConfiguration({
          isBatchModeEnabled: batchMode,
        });

        const codes = result?.readableCodes ?? [];
        addLog(
          `Barcode scanner resolved – ${codes.length} code(s) detected.`,
          'success',
        );

        if (codes.length > 0) {
          const summary = codes
            .map((c, i) => `${i + 1}. [${c.type}] ${c.value}`)
            .join('\n');
          setLastResult(summary);
        } else {
          setLastResult('No codes detected.');
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        const isCancelled =
          message.toLowerCase().includes('cancel') ||
          message.toLowerCase().includes('user') ||
          message.toLowerCase().includes('dismiss');
        addLog(
          isCancelled
            ? 'User cancelled – barcode scanner closed.'
            : `Barcode error: ${message}`,
          isCancelled ? 'cancelled' : 'error',
        );
        setLastError(message);
      }
    },
    [addLog],
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
    setStatus('idle');
    setLastResult(null);
    setLastError(null);
  }, []);

  const isDark = colorScheme === 'dark';
  const theme = {
    bg: isDark ? '#1a1a2e' : '#f5f5f9',
    card: isDark ? '#16213e' : '#ffffff',
    text: isDark ? '#e8e8e8' : '#1a1a1a',
    muted: isDark ? '#a0a0a0' : '#666',
    primary: '#4361ee',
    success: '#06d6a0',
    error: '#ef476f',
    cancelled: '#ffd166',
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: theme.text }]}>
        Genius Scan SDK Test
      </Text>
      <Text style={[styles.subtitle, { color: theme.muted }]}>
        Open the scanner, then cancel. Check that the flow stops and status
        shows "Cancelled".
      </Text>

      {!GeniusScan && (
        <View style={[styles.warningBanner, { backgroundColor: theme.error }]}>
          <Text style={styles.warningText}>
            Genius Scan native module not linked. Run "cd ios && pod install"
            then rebuild.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: theme.primary },
          status === 'opening' && styles.buttonDisabled,
        ]}
        onPress={startScanner}
        disabled={status === 'opening'}
      >
        {status === 'opening' ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Open scanner (camera)</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: '#7209b7' },
          status === 'opening' && styles.buttonDisabled,
        ]}
        onPress={() => startBarcodeScanner(false)}
        disabled={status === 'opening'}
      >
        <Text style={styles.buttonText}>Scan barcode</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: '#3a0ca3' },
          status === 'opening' && styles.buttonDisabled,
        ]}
        onPress={() => startBarcodeScanner(true)}
        disabled={status === 'opening'}
      >
        <Text style={styles.buttonText}>Scan barcodes (batch mode)</Text>
      </TouchableOpacity>

      <View style={[styles.statusCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.statusLabel, { color: theme.muted }]}>Status</Text>
        <Text
          style={[
            styles.statusValue,
            {
              color:
                status === 'cancelled'
                  ? theme.cancelled
                  : status === 'success'
                  ? theme.success
                  : status === 'error'
                  ? theme.error
                  : theme.text,
            },
          ]}
        >
          {status}
        </Text>
      </View>

      {lastResult ? (
        <View style={[styles.resultCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.resultLabel, { color: theme.muted }]}>
            Last result
          </Text>
          <Text
            style={[styles.resultText, { color: theme.text }]}
            numberOfLines={5}
          >
            {lastResult}
          </Text>
        </View>
      ) : null}

      {lastError ? (
        <View style={[styles.resultCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.resultLabel, { color: theme.error }]}>
            Last error / cancel
          </Text>
          <Text
            style={[styles.resultText, { color: theme.text }]}
            numberOfLines={3}
          >
            {lastError}
          </Text>
        </View>
      ) : null}

      <View style={[styles.logCard, { backgroundColor: theme.card }]}>
        <View style={styles.logHeader}>
          <Text style={[styles.logTitle, { color: theme.text }]}>Log</Text>
          <TouchableOpacity onPress={clearLogs}>
            <Text style={[styles.clearButton, { color: theme.primary }]}>
              Clear
            </Text>
          </TouchableOpacity>
        </View>
        {logs.length === 0 ? (
          <Text style={[styles.logEmpty, { color: theme.muted }]}>
            Tap "Open scanner" and then cancel to see logs.
          </Text>
        ) : (
          logs
            .slice()
            .reverse()
            .slice(0, 20)
            .map((entry, i) => (
              <Text
                key={`${entry.time}-${i}`}
                style={[styles.logLine, { color: theme.text }]}
              >
                [{entry.time}] {entry.message}
              </Text>
            ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  warningBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    color: '#fff',
    fontSize: 14,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  resultCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  resultText: {
    fontSize: 14,
  },
  logCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    fontSize: 14,
    fontWeight: '500',
  },
  logEmpty: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  logLine: {
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});
