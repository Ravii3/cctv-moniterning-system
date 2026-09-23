import React, { useState, useEffect } from 'react';
import { BackendApiService } from '../../services/backendApi';
import { SqlQueryLog } from '../../types/camera';
import { 
  Database, Terminal, Code2, Server, Play, 
  Copy, Check, RefreshCw, Layers, Cpu, FileText, CheckCircle2
} from 'lucide-react';

export const PhpMysqlConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'query_runner' | 'live_sql_log' | 'php_source' | 'schema_ddl'>('query_runner');
  const [sqlInput, setSqlInput] = useState<string>('SELECT id, name, ip_address, brand, resolution, bitrate_kbps, status FROM tbl_cameras ORDER BY id ASC;');
  const [queryResult, setQueryResult] = useState<{ success: boolean; message: string; rows: any[]; executionTimeMs: number } | null>(null);
  const [sqlLogs, setSqlLogs] = useState<SqlQueryLog[]>(BackendApiService.getSqlLogs());
  const [selectedFile, setSelectedFile] = useState<string>('api/cameras.php');
  const [copied, setCopied] = useState(false);

  // Subscribe to live SQL logs
  useEffect(() => {
    return BackendApiService.subscribeSqlLogs((logs) => {
      setSqlLogs([...logs]);
    });
  }, []);

  // Execute initial query on mount
  useEffect(() => {
    const res = BackendApiService.executeCustomSql(sqlInput);
    setQueryResult(res);
  }, []);

  const handleRunQuery = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sqlInput.trim()) return;
    const res = BackendApiService.executeCustomSql(sqlInput);
    setQueryResult(res);
  };

  const phpFiles = BackendApiService.getPhpSourceFiles();

  const handleCopyCode = () => {
    if (!phpFiles[selectedFile]) return;
    navigator.clipboard.writeText(phpFiles[selectedFile].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-slate-950 p-4 overflow-y-auto space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <span>PHP & MySQL Surveillance Architecture Console</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Underlying LAMP/LNMP stack engine: PHP 8.2 PDO driver, ONVIF SOAP services, and MySQL relational database.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('query_runner')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              activeTab === 'query_runner'
                ? 'bg-cyan-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Interactive SQL Runner</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('live_sql_log')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              activeTab === 'live_sql_log'
                ? 'bg-cyan-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Live Query Log ({sqlLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('php_source')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              activeTab === 'php_source'
                ? 'bg-cyan-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>PHP Backend Code</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schema_ddl')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              activeTab === 'schema_ddl'
                ? 'bg-cyan-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>MySQL Schema DDL</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Interactive SQL Query Runner */}
      {activeTab === 'query_runner' && (
        <div className="flex flex-col gap-4 flex-1">
          {/* Query Preset Quick-Picks */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs py-1">
            <span className="text-[11px] font-mono text-slate-500 shrink-0">Sample Queries:</span>
            <button
              type="button"
              onClick={() => {
                const q = 'SELECT id, name, ip_address, brand, resolution, bitrate_kbps, status FROM tbl_cameras ORDER BY id ASC;';
                setSqlInput(q);
                setQueryResult(BackendApiService.executeCustomSql(q));
              }}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded font-mono text-cyan-300 text-[11px] shrink-0"
            >
              SELECT * FROM tbl_cameras
            </button>
            <button
              type="button"
              onClick={() => {
                const q = 'SELECT id, camera_id, event_type, severity, confidence, timestamp FROM tbl_motion_events ORDER BY timestamp DESC;';
                setSqlInput(q);
                setQueryResult(BackendApiService.executeCustomSql(q));
              }}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded font-mono text-cyan-300 text-[11px] shrink-0"
            >
              SELECT * FROM tbl_motion_events
            </button>
            <button
              type="button"
              onClick={() => {
                const q = 'SELECT port_number, link_status, camera_name, power_watts, link_speed FROM tbl_poe_ports;';
                setSqlInput(q);
                setQueryResult(BackendApiService.executeCustomSql(q));
              }}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded font-mono text-cyan-300 text-[11px] shrink-0"
            >
              SELECT * FROM tbl_poe_ports
            </button>
            <button
              type="button"
              onClick={() => {
                const q = 'SELECT id, camera_id, start_time, end_time, type, file_size_mb FROM tbl_recordings;';
                setSqlInput(q);
                setQueryResult(BackendApiService.executeCustomSql(q));
              }}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded font-mono text-cyan-300 text-[11px] shrink-0"
            >
              SELECT * FROM tbl_recordings
            </button>
          </div>

          {/* SQL Input Area */}
          <form onSubmit={handleRunQuery} className="flex flex-col gap-2 bg-slate-900/80 border border-slate-800 rounded-xl p-3 shadow-md">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Database className="w-3.5 h-3.5" />
                <span>mysql&gt; cctv_surveillance_db</span>
              </span>
              <button
                type="submit"
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>Execute SQL</span>
              </button>
            </div>

            <textarea
              rows={3}
              value={sqlInput}
              onChange={(e) => setSqlInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-cyan-200 focus:outline-none focus:border-cyan-500 resize-none selection:bg-cyan-900/50"
              placeholder="Enter valid SQL statement..."
            />
          </form>

          {/* Query Output Results Table */}
          {queryResult && (
            <div className="flex flex-col gap-2 flex-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className={queryResult.success ? 'text-emerald-400' : 'text-red-400'}>
                  {queryResult.message}
                </span>
                <span className="text-slate-500">
                  Execution: {queryResult.executionTimeMs} ms
                </span>
              </div>

              {queryResult.rows.length > 0 && (
                <div className="border border-slate-800 rounded-lg overflow-x-auto bg-slate-900/60 max-h-96 shadow-inner">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950/80 border-b border-slate-800 text-[10px] uppercase text-slate-400">
                      <tr>
                        {Object.keys(queryResult.rows[0])
                          .filter(k => typeof queryResult.rows[0][k] !== 'object')
                          .map((col) => (
                            <th key={col} className="py-2 px-3 whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-[11px]">
                      {queryResult.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-800/50 transition-colors">
                          {Object.keys(row)
                            .filter(k => typeof row[k] !== 'object')
                            .map((col, cIdx) => (
                              <td key={cIdx} className="py-2 px-3 whitespace-nowrap text-slate-300">
                                {String(row[col])}
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Live SQL Query Log */}
      {activeTab === 'live_sql_log' && (
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Streaming SQL transactions triggered by portal camera operations & telemetry polling:</span>
            <span className="font-mono text-cyan-400">{sqlLogs.length} statements logged</span>
          </div>

          <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
            <div className="divide-y divide-slate-800/80 font-mono text-xs">
              {sqlLogs.map((log) => (
                <div key={log.id} className="p-3 hover:bg-slate-900/40 transition-colors flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-bold">{log.endpoint}</span>
                      <span>·</span>
                      <span>{log.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">{log.executionTimeMs} ms</span>
                      <span>·</span>
                      <span>{log.rowsAffected} rows affected</span>
                    </div>
                  </div>
                  <div className="text-slate-200 text-[11px] selection:bg-cyan-900/60 overflow-x-auto">
                    {log.query}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: PHP Source Code Inspector */}
      {activeTab === 'php_source' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
          {/* File Picker */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 flex flex-col gap-1 text-xs">
            <span className="text-[10px] font-mono uppercase text-slate-400 px-2 py-1">Backend Files</span>
            {Object.keys(phpFiles).map((fileName) => (
              <button
                key={fileName}
                type="button"
                onClick={() => setSelectedFile(fileName)}
                className={`p-2 rounded text-left transition-colors font-mono text-[11px] flex items-center gap-2 ${
                  selectedFile === fileName
                    ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{fileName}</span>
              </button>
            ))}
          </div>

          {/* Code Viewer */}
          <div className="md:col-span-3 flex flex-col bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900/60 text-xs">
              <div>
                <span className="font-mono text-cyan-300 font-bold">{selectedFile}</span>
                <p className="text-[11px] text-slate-400 mt-0.5">{phpFiles[selectedFile]?.description}</p>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1.5 transition-colors font-mono text-[11px]"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>

            <div className="p-4 overflow-x-auto flex-1 font-mono text-xs text-slate-300 max-h-[500px] overflow-y-auto bg-slate-950">
              <pre className="selection:bg-cyan-900/60">
                <code>{phpFiles[selectedFile]?.code}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: MySQL Schema DDL */}
      {activeTab === 'schema_ddl' && (
        <div className="flex flex-col gap-3 flex-1 bg-slate-950 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <h3 className="text-xs font-semibold text-slate-200 font-mono">schema/cctv_database.sql</h3>
              <p className="text-[11px] text-slate-400">
                MySQL 8.0 / MariaDB production DDL schema with primary keys, indexes, and foreign keys.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(phpFiles['schema/cctv_database.sql'].code);
                alert('Schema DDL copied to clipboard.');
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-mono"
            >
              Copy DDL
            </button>
          </div>

          <div className="overflow-x-auto flex-1 font-mono text-xs text-cyan-100 max-h-[500px] overflow-y-auto">
            <pre>
              <code>{phpFiles['schema/cctv_database.sql'].code}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
