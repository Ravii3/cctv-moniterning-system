import React from 'react';
import { Camera, ShieldAlert, Database, Network, Film, Video, Plus } from 'lucide-react';

export type PortalTab = 'monitor' | 'devices' | 'network' | 'playback' | 'alarms' | 'developer';

interface TopNavbarProps {
  activeTab: PortalTab;
  onTabChange: (tab: PortalTab) => void;
  unacknowledgedAlerts: number;
  onQuickAddCamera: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  activeTab,
  onTabChange,
  unacknowledgedAlerts,
  onQuickAddCamera
}) => {
  return (
    <header className="flex items-center justify-between px-6 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onTabChange('monitor');
        }}
        className="text-base font-bold tracking-tight text-white flex items-center gap-2 hover:text-cyan-400 transition-colors"
      >
        <span>NetVision Sentinel</span>
      </a>

      {/* Zone 2: 4-6 clean text navigation links with subtle indicators */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
        <button
          type="button"
          onClick={() => onTabChange('monitor')}
          className={`transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'monitor' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>Live Monitor</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('devices')}
          className={`transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'devices' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Devices</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('network')}
          className={`transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'network' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>IP Networking</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('playback')}
          className={`transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'playback' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Playback</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('alarms')}
          className={`transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'alarms' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Alarms</span>
          {unacknowledgedAlerts > 0 && (
            <span className="text-[10px] font-mono bg-red-950 text-red-400 border border-red-800 px-1.5 rounded-full font-bold">
              {unacknowledgedAlerts}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onTabChange('developer')}
          className={`transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'developer' ? 'text-cyan-400 font-semibold' : 'hover:text-slate-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>PHP & MySQL</span>
        </button>
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onQuickAddCamera}
          className="px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-500 transition-colors whitespace-nowrap shadow-md shadow-cyan-950/40 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Camera</span>
        </button>
      </div>
    </header>
  );
};
