import React, { useState, useEffect } from 'react';

export function LiveBuildConsole() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Intercept console output to display build steps inside the app UI
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args: any[]) => {
      setLogs(prev => [...prev.slice(-50), `[LOG]: ${args.join(' ')}`]);
      originalLog(...args);
    };

    console.error = (...args: any[]) => {
      setLogs(prev => [...prev.slice(-50), `[ERROR]: ${args.join(' ')}`]);
      originalError(...args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  return (
    <div style={{ backgroundColor: '#0b0f19', color: '#00ffcc', padding: '12px', fontFamily: 'monospace', fontSize: '12px', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto' }}>
      <div style={{ fontWeight: 'bold', borderBottom: '1px solid #1f2937', marginBottom: '8px', paddingBottom: '4px' }}>
        Live Build Console Stream
      </div>
      {logs.length === 0 ? (
        <div style={{ color: '#6b7280' }}>Initializing pipeline stream...</div>
      ) : (
        logs.map((log, index) => (
          <div key={index} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginBottom: '4px' }}>
            {log}
          </div>
        ))
      )}
    </div>
  );
}
