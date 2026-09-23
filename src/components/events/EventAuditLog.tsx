import React, { useState } from 'react';
import { CameraDevice, MotionEvent } from '../../types/camera';
import { 
  ShieldAlert, AlertTriangle, Eye, CheckCircle2, 
  Clock, Filter, Search, UserCheck, Check, X, Shield, Bell
} from 'lucide-react';

interface EventAuditLogProps {
  events: MotionEvent[];
  cameras: CameraDevice[];
  onAcknowledgeEvent: (eventId: string, operator: string) => void;
  onSimulateAlarm: (cameraId: string, eventType: MotionEvent['eventType'], severity: MotionEvent['severity']) => void;
}

export const EventAuditLog: React.FC<EventAuditLogProps> = ({
  events,
  cameras,
  onAcknowledgeEvent,
  onSimulateAlarm
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [cameraFilter, setCameraFilter] = useState<string>('all');
  const [selectedEventForModal, setSelectedEventForModal] = useState<MotionEvent | null>(null);
  const [operatorName, setOperatorName] = useState('Officer_K_Reeves');

  const filteredEvents = events.filter((e) => {
    const matchesSeverity = severityFilter === 'all' || e.severity === severityFilter;
    const matchesCamera = cameraFilter === 'all' || e.cameraId === cameraFilter;
    return matchesSeverity && matchesCamera;
  });

  const unacknowledgedCount = events.filter(e => !e.acknowledged).length;

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-slate-950 p-4 overflow-y-auto space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>Surveillance Alarms & Motion Audit Trail</span>
            {unacknowledgedCount > 0 && (
              <span className="text-[11px] font-mono bg-red-950/80 text-red-300 border border-red-800 px-2 py-0.5 rounded-full animate-pulse">
                {unacknowledgedCount} Unacknowledged
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time optical AI and physical line-crossing telemetry incidents.
          </p>
        </div>

        {/* Alarm Simulator Button for Demo Testing */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSimulateAlarm(cameras[0]?.id || 'CAM-01', 'vehicle_detected', 'medium')}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate Gate Trigger</span>
          </button>

          <button
            type="button"
            onClick={() => onSimulateAlarm(cameras[4]?.id || 'CAM-05', 'line_crossing', 'high')}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span>Simulate Perimeter Intrusion</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-1">
        <div className="flex items-center gap-2">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={cameraFilter}
            onChange={(e) => setCameraFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">All Cameras</option>
            {cameras.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span>Active Operator:</span>
          <input
            type="text"
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-cyan-300 w-36 focus:outline-none"
          />
        </div>
      </div>

      {/* Events Table */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/60 shadow-inner">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400">
              <tr>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">Camera / Channel</th>
                <th className="py-2.5 px-3">Zone Triggered</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3">Acknowledgment</th>
                <th className="py-2.5 px-3 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                    No security events match the current filter.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Severity */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          evt.severity === 'critical'
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : evt.severity === 'high'
                            ? 'bg-orange-950 text-orange-400 border border-orange-800'
                            : evt.severity === 'medium'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {evt.severity}
                      </span>
                    </td>

                    {/* Event Type */}
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-200 capitalize">
                      {evt.eventType.replace('_', ' ')}
                    </td>

                    {/* Camera */}
                    <td className="py-2.5 px-3 text-cyan-300">
                      {evt.cameraName}
                    </td>

                    {/* Zone */}
                    <td className="py-2.5 px-3 text-slate-400">
                      {evt.zone}
                    </td>

                    {/* Timestamp */}
                    <td className="py-2.5 px-3 text-slate-400">
                      {evt.timestamp}
                    </td>

                    {/* Confidence */}
                    <td className="py-2.5 px-3 text-emerald-400 tabular-nums">
                      {evt.confidence}%
                    </td>

                    {/* Acknowledgment */}
                    <td className="py-2.5 px-3">
                      {evt.acknowledged ? (
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] text-slate-400">{evt.acknowledgedBy}</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAcknowledgeEvent(evt.id, operatorName)}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-emerald-900/60 border border-slate-700 hover:border-emerald-600 rounded text-slate-300 hover:text-emerald-200 text-[10px] transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedEventForModal(evt)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
                        title="View Event Snapshot"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Snapshot Preview Modal */}
      {selectedEventForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span className="text-xs font-semibold text-slate-100">
                  Incident Review: {selectedEventForModal.id} ({selectedEventForModal.cameraName})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEventForModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <div className="relative rounded-lg overflow-hidden bg-black border border-slate-800 max-h-72 flex items-center justify-center">
                <img
                  src={selectedEventForModal.snapshotUrl || '/src/assets/images/cctv_parking_lot_1790157500153.jpg'}
                  alt="Incident Snapshot"
                  className="w-full h-full object-cover"
                />
                {/* Simulated Target Bounding Box */}
                <div className="absolute top-1/4 left-1/3 w-32 h-24 border-2 border-red-500 bg-red-500/10 flex items-start p-1 pointer-events-none">
                  <span className="text-[10px] font-mono font-bold bg-red-600 text-white px-1 rounded-[1px]">
                    {selectedEventForModal.eventType.toUpperCase()} {selectedEventForModal.confidence}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-slate-950 p-3 rounded border border-slate-800">
                <div>
                  <span className="text-slate-500 block">Trigger Timestamp:</span>
                  <span className="text-slate-200">{selectedEventForModal.timestamp}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Zone:</span>
                  <span className="text-slate-200">{selectedEventForModal.zone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Event Severity:</span>
                  <span className="text-red-400 uppercase font-bold">{selectedEventForModal.severity}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Duration:</span>
                  <span className="text-slate-200">{selectedEventForModal.durationSeconds} seconds</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-3 border-t border-slate-800 bg-slate-950">
              {!selectedEventForModal.acknowledged && (
                <button
                  type="button"
                  onClick={() => {
                    onAcknowledgeEvent(selectedEventForModal.id, operatorName);
                    setSelectedEventForModal(null);
                  }}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition-colors"
                >
                  Sign Off & Acknowledge
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedEventForModal(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
