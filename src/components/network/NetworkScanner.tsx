import React, { useState } from 'react';
import { CameraDevice, NetworkHost, PoePortStatus } from '../../types/camera';
import { 
  Network, Wifi, Radio, Server, Cpu, HardDrive, 
  Search, Shield, CheckCircle2, AlertCircle, Play, 
  Check, RefreshCw, Zap, ArrowRight, Layers, Sliders
} from 'lucide-react';

interface NetworkScannerProps {
  hosts: NetworkHost[];
  poePorts: PoePortStatus[];
  onAdoptHost: (host: NetworkHost) => void;
  onRefreshScan: () => void;
}

export const NetworkScanner: React.FC<NetworkScannerProps> = ({
  hosts,
  poePorts,
  onAdoptHost,
  onRefreshScan
}) => {
  const [subnetCidr, setSubnetCidr] = useState('192.168.1.0/24');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanLogs, setScanLogs] = useState<string[]>([
    'ARP & ICMP ping sweep initialized on interface eth0 (192.168.1.20/24)',
    'Probing well-known surveillance ports: 554 (RTSP), 80/443 (HTTP/S), 8000/8080 (ONVIF WS-Discovery)',
    'Scan idle. Ready for subnet discovery.'
  ]);

  // Bandwidth & Storage Calculator State
  const [calcCameras, setCalcCameras] = useState<number>(6);
  const [calcResolution, setCalcResolution] = useState<'4K' | '2K' | '1080p' | '720p'>('4K');
  const [calcFps, setCalcFps] = useState<number>(30);
  const [calcCodec, setCalcCodec] = useState<'H.265' | 'H.264'>('H.265');
  const [calcHours, setCalcHours] = useState<number>(24);
  const [calcDays, setCalcDays] = useState<number>(30);
  const [calcRaid, setCalcRaid] = useState<'RAID-5' | 'RAID-6' | 'RAID-10' | 'JBOD'>('RAID-5');

  // Trigger Network Scan Simulation
  const handleStartScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanLogs([`Starting ARP sweep across CIDR ${subnetCidr}...`]);

    let step = 0;
    const interval = setInterval(() => {
      step += 15;
      setScanProgress(Math.min(100, step));

      if (step === 30) {
        setScanLogs(prev => [
          ...prev,
          '192.168.1.1: Gateway responding (0.8ms, Cisco SG350-28P)',
          '192.168.1.101: Open ports [80, 554, 8000] - Hikvision ColorVu ONVIF profile matched'
        ]);
      } else if (step === 60) {
        setScanLogs(prev => [
          ...prev,
          '192.168.1.102: Open ports [80, 554] - Axis Communications RTSP Stream verified',
          '192.168.1.118: Discovered unmanaged host! MAC: E0:50:8B:66:31:0C (Amcrest NV4108)',
          '192.168.1.125: Discovered unmanaged host! MAC: 94:A6:7E:11:82:77 (Reolink RLC-810A)'
        ]);
      } else if (step >= 100) {
        clearInterval(interval);
        setIsScanning(false);
        setScanLogs(prev => [
          ...prev,
          'Subnet discovery completed. 10 hosts active, 2 unmanaged cameras ready for adoption.'
        ]);
        onRefreshScan();
      }
    }, 400);
  };

  // Calculator Math:
  // Base bitrate estimation in Mbps per camera
  const bitrateMap: Record<string, number> = {
    '4K-H.265-30': 6.0,
    '4K-H.264-30': 12.0,
    '2K-H.265-30': 3.5,
    '2K-H.264-30': 7.0,
    '1080p-H.265-30': 2.0,
    '1080p-H.264-30': 4.0,
    '720p-H.265-30': 1.0,
    '720p-H.264-30': 2.0,
  };

  const key = `${calcResolution}-${calcCodec}-30`;
  const baseRate = (bitrateMap[key] || 4.0) * (calcFps / 30);
  const totalBitrateMbps = (baseRate * calcCameras).toFixed(1);
  const totalBitrateMBps = (Number(totalBitrateMbps) / 8).toFixed(2);
  
  // Storage per day in GB
  // (bitrate Mbps * 3600 * hours / 8) / 1000
  const dailyGbPerCam = (baseRate * 3600 * calcHours) / (8 * 1000);
  const totalDailyGb = (dailyGbPerCam * calcCameras).toFixed(1);
  const totalRetentionTbRaw = ((Number(totalDailyGb) * calcDays) / 1000);
  
  // RAID overhead
  let raidMultiplier = 1.0;
  if (calcRaid === 'RAID-5') raidMultiplier = 1.33; // ~4 drives, 1 parity
  if (calcRaid === 'RAID-6') raidMultiplier = 1.5;  // 2 parity
  if (calcRaid === 'RAID-10') raidMultiplier = 2.0; // 50% mirror
  const totalStorageNeededTb = (totalRetentionTbRaw * raidMultiplier).toFixed(1);

  // Total PoE Consumption
  const totalPoeWatts = poePorts.reduce((acc, p) => acc + p.powerWatts, 0).toFixed(1);
  const maxPoeBudget = 280; // 280 Watts max switch budget
  const poePercent = ((Number(totalPoeWatts) / maxPoeBudget) * 100).toFixed(0);

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-slate-950 p-4 overflow-y-auto space-y-6">
      {/* 1. Top Section: Subnet Scanner & Discovery */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Network className="w-4 h-4 text-cyan-400" />
              <span>IP Subnet Scanner & ONVIF Device Discovery</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Probe local IP subnets for RTSP streams, ONVIF Profile S/T/G devices, and open camera ports.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-slate-500 font-mono mr-1.5 text-[11px]">CIDR:</span>
              <input
                type="text"
                value={subnetCidr}
                onChange={(e) => setSubnetCidr(e.target.value)}
                className="bg-transparent font-mono text-cyan-300 focus:outline-none w-32"
              />
            </div>

            <button
              type="button"
              disabled={isScanning}
              onClick={handleStartScan}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-md ${
                isScanning
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/30'
              }`}
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning ({scanProgress}%)...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Scan Subnet</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scan Progress Bar & Terminal Logs */}
        {isScanning && (
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-cyan-500 h-full transition-all duration-300"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        )}

        <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-2.5 font-mono text-[11px] text-slate-400 max-h-24 overflow-y-auto space-y-0.5">
          {scanLogs.map((log, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-cyan-500 select-none">&gt;</span>
              <span className={log.includes('Discovered') ? 'text-amber-300 font-medium' : ''}>{log}</span>
            </div>
          ))}
        </div>

        {/* Discovered Hosts Table */}
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400">
              <tr>
                <th className="py-2 px-3">IP Address</th>
                <th className="py-2 px-3">MAC / OUI Vendor</th>
                <th className="py-2 px-3">Hostname</th>
                <th className="py-2 px-3">Open Ports</th>
                <th className="py-2 px-3">Protocols</th>
                <th className="py-2 px-3">Latency</th>
                <th className="py-2 px-3 text-right">Status / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 font-mono text-[11px]">
              {hosts.map((host) => (
                <tr key={host.ip} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-2 px-3 text-cyan-300 font-medium">{host.ip}</td>
                  <td className="py-2 px-3">
                    <span className="text-slate-300 block">{host.mac}</span>
                    <span className="text-[10px] text-slate-500 truncate max-w-[180px] block">{host.vendor}</span>
                  </td>
                  <td className="py-2 px-3 text-slate-300">{host.hostname}</td>
                  <td className="py-2 px-3 text-slate-400">
                    {host.openPorts.join(', ')}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1.5 text-[10px]">
                      {host.rtspSupported && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                          RTSP:554
                        </span>
                      )}
                      {host.onvifSupported && (
                        <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                          ONVIF
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-slate-400 tabular-nums">
                    {host.latencyMs} ms
                  </td>
                  <td className="py-2 px-3 text-right">
                    {host.isManaged ? (
                      <span className="text-emerald-400 font-medium text-[11px] inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Managed</span>
                      </span>
                    ) : host.status === 'camera_auth_required' ? (
                      <button
                        type="button"
                        onClick={() => onAdoptHost(host)}
                        className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-sans font-medium transition-colors shadow-sm"
                      >
                        Adopt Camera
                      </button>
                    ) : (
                      <span className="text-slate-500 text-[11px]">System Host</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Middle Section: 24-Port Managed PoE Switch Telemetry */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Surveillance PoE+ Switch & Power Budgeting</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cisco SG350-28P 24-Port Gigabit PoE+ Managed Switch (802.3at/af, Max 280W Budget)
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">PoE Load:</span>
              <span className="text-amber-400 font-bold tabular-nums">{totalPoeWatts}W</span>
              <span className="text-slate-500">/ {maxPoeBudget}W ({poePercent}%)</span>
            </div>
            <div className="w-24 bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-amber-400 h-full transition-all duration-300"
                style={{ width: `${poePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Physical 24-Port Switch Panel Visual */}
        <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg shadow-inner">
          <div className="grid grid-cols-12 gap-1.5">
            {poePorts.map((p) => (
              <div
                key={p.portNumber}
                title={`Port ${p.portNumber}: ${p.cameraName || 'Inactive'} · ${p.powerWatts}W · ${p.linkSpeed} · VLAN ${p.vlan}`}
                className={`p-2 rounded border flex flex-col items-center justify-center gap-1 transition-all ${
                  p.status === 'up'
                    ? 'bg-slate-900 border-slate-700 hover:border-cyan-500'
                    : 'bg-slate-950/60 border-slate-900 opacity-60'
                }`}
              >
                {/* Port Number & Link LED */}
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-mono text-slate-400">{p.portNumber}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      p.status === 'up' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'
                    }`}
                  />
                </div>

                {/* RJ45 Port Socket Graphic */}
                <div className="w-6 h-5 rounded-[2px] bg-slate-950 border border-slate-800 flex items-center justify-center">
                  <div className="w-3.5 h-1.5 bg-slate-800 rounded-t-[1px]" />
                </div>

                {/* Wattage / Speed */}
                <span className="text-[9px] font-mono text-cyan-300 tabular-nums">
                  {p.status === 'up' ? `${p.powerWatts}W` : 'DOWN'}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 px-1">
            <span>Ports 1-12: VLAN 10 (CCTV Video Stream)</span>
            <span>Ports 13-18: VLAN 20 (NVR & Storage)</span>
            <span>Ports 23-24: 1000BASE-X SFP Uplink</span>
          </div>
        </div>
      </div>

      {/* 3. Bottom Section: Storage & Bandwidth NVR Engineering Calculator */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 shadow-sm">
        <div className="border-b border-slate-800/80 pb-3">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span>NVR Storage & Network Bandwidth Calculator</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Accurately size surveillance disk arrays, RAID parity overhead, and switch uplink saturation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Camera Count */}
            <div className="flex flex-col gap-1.5 bg-slate-950/70 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between">
                <label className="text-slate-300 font-medium">Total Camera Channels</label>
                <span className="font-mono text-cyan-400 font-bold">{calcCameras} Cameras</span>
              </div>
              <input
                type="range"
                min={1}
                max={32}
                value={calcCameras}
                onChange={(e) => setCalcCameras(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded accent-cyan-500"
              />
            </div>

            {/* Stream Resolution */}
            <div className="flex flex-col gap-1.5 bg-slate-950/70 p-3 rounded-lg border border-slate-800">
              <label className="text-slate-300 font-medium">Stream Resolution</label>
              <select
                value={calcResolution}
                onChange={(e) => setCalcResolution(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
              >
                <option value="4K">4K Ultra HD (3840x2160)</option>
                <option value="2K">2K Quad HD (2560x1440)</option>
                <option value="1080p">1080p Full HD (1920x1080)</option>
                <option value="720p">720p HD (1280x720)</option>
              </select>
            </div>

            {/* Video Codec */}
            <div className="flex flex-col gap-1.5 bg-slate-950/70 p-3 rounded-lg border border-slate-800">
              <label className="text-slate-300 font-medium">Video Compression</label>
              <select
                value={calcCodec}
                onChange={(e) => setCalcCodec(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
              >
                <option value="H.265">H.265 (HEVC - 50% Bitrate Reduction)</option>
                <option value="H.264">H.264 (Standard AVC)</option>
              </select>
            </div>

            {/* Frame Rate */}
            <div className="flex flex-col gap-1.5 bg-slate-950/70 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between">
                <label className="text-slate-300 font-medium">Recording Frame Rate</label>
                <span className="font-mono text-cyan-400 font-bold">{calcFps} FPS</span>
              </div>
              <input
                type="range"
                min={10}
                max={60}
                step={5}
                value={calcFps}
                onChange={(e) => setCalcFps(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded accent-cyan-500"
              />
            </div>

            {/* Retention Days */}
            <div className="flex flex-col gap-1.5 bg-slate-950/70 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between">
                <label className="text-slate-300 font-medium">Retention Policy (Days)</label>
                <span className="font-mono text-cyan-400 font-bold">{calcDays} Days</span>
              </div>
              <input
                type="range"
                min={7}
                max={90}
                value={calcDays}
                onChange={(e) => setCalcDays(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded accent-cyan-500"
              />
            </div>

            {/* RAID Level */}
            <div className="flex flex-col gap-1.5 bg-slate-950/70 p-3 rounded-lg border border-slate-800">
              <label className="text-slate-300 font-medium">Storage Redundancy (RAID)</label>
              <select
                value={calcRaid}
                onChange={(e) => setCalcRaid(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
              >
                <option value="RAID-5">RAID-5 (Single Parity, Recommended)</option>
                <option value="RAID-6">RAID-6 (Dual Parity, High Fault Tolerance)</option>
                <option value="RAID-10">RAID-10 (Mirrored Stripping)</option>
                <option value="JBOD">JBOD (No Redundancy)</option>
              </select>
            </div>
          </div>

          {/* Calculator Output KPI Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-[11px] uppercase font-mono text-slate-400 tracking-wider block">
                Calculated Infrastructure Metrics
              </span>

              <div className="flex flex-col gap-1 border-b border-slate-800/80 pb-3">
                <span className="text-xs text-slate-400">Total Ingestion Bandwidth:</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-cyan-400 tabular-nums">
                    {totalBitrateMbps} Mbps
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    ({totalBitrateMBps} MB/s)
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1 border-b border-slate-800/80 pb-3">
                <span className="text-xs text-slate-400">Daily Storage Ingestion:</span>
                <span className="text-xl font-bold font-mono text-slate-200 tabular-nums">
                  {totalDailyGb} GB / day
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Required {calcRaid} Array Capacity:</span>
                <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
                  {totalStorageNeededTb} TB
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Recommended: 4x 18TB WD Purple Pro HDD Array
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>Uplink saturation:</span>
              <span className="text-emerald-400 font-bold">{(Number(totalBitrateMbps) / 10).toFixed(1)}% of 1Gbps</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
