import React, { useState } from 'react';
import { Radio, Key, CheckCircle, AlertCircle, ExternalLink, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { getStoredAccountKey, setStoredAccountKey, testAccountKey } from '../services/api.ts';

interface LiveConnectionBannerProps {
  dataSource: 'lta_live' | 'simulated';
  hasActiveKey: boolean;
  onRefreshLive: () => void;
  onOpenSettingsModal: () => void;
}

export const LiveConnectionBanner: React.FC<LiveConnectionBannerProps> = ({
  dataSource,
  hasActiveKey,
  onRefreshLive,
  onOpenSettingsModal
}) => {
  const [inputKey, setInputKey] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const handleConnectDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = inputKey.trim();
    if (!cleanKey) {
      setFeedback({ type: 'error', message: 'Please enter your LTA DataMall AccountKey.' });
      return;
    }

    setIsConnecting(true);
    setFeedback(null);
    try {
      const testRes = await testAccountKey(cleanKey);
      if (testRes.success) {
        setStoredAccountKey(cleanKey);
        setFeedback({ type: 'success', message: 'Successfully authenticated with LTA DataMall! Switching to live stream...' });
        setInputKey('');
        setTimeout(() => {
          onRefreshLive();
          setFeedback(null);
        }, 800);
      } else {
        setFeedback({
          type: 'error',
          message: testRes.message || 'LTA DataMall rejected this AccountKey. Please verify your 32-character key from datamall.lta.gov.sg.'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Connection to LTA DataMall timed out. Please check network connectivity.'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setStoredAccountKey('');
    onRefreshLive();
    setFeedback(null);
  };

  if (dataSource === 'lta_live') {
    return (
      <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 fill-current text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-300">Direct Live Feed Connected</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <p className="text-slate-300 text-[11px] leading-snug">
              Streaming real-time GPS arrivals directly from <code className="text-emerald-400 font-mono">datamall2.mytransport.sg/ltaodataservice/v3/BusArrival</code> with authenticated <code className="text-emerald-300 font-mono">AccountKey</code>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenSettingsModal}
            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:text-white bg-emerald-900/40 hover:bg-emerald-900/60 border border-emerald-700/60 rounded-lg transition-colors"
          >
            Manage Key
          </button>
          <button
            onClick={handleDisconnect}
            className="px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-rose-300 transition-colors"
          >
            Switch to Demo
          </button>
        </div>
      </div>
    );
  }

  // Not yet connected to live LTA DataMall
  return (
    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-xs space-y-2.5 shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100">Connect Directly to Live LTA DataMall</span>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded font-semibold">
                Needs AccountKey
              </span>
            </div>
            <p className="text-slate-300 text-[11px] leading-snug">
              Singapore LTA requires the <code className="text-emerald-400 font-mono">AccountKey:</code> HTTP header to stream live v3 BusArrival &amp; TrafficIncidents data. Paste your key below to connect directly:
            </p>
          </div>
        </div>

        <a
          href="https://datamall.lta.gov.sg/content/datamall/en/request-api.html"
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-medium text-emerald-400 hover:underline inline-flex items-center gap-1 self-start md:self-auto shrink-0"
        >
          <span>Get Free LTA Key</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Direct Connect Form */}
      <form onSubmit={handleConnectDirectly} className="flex flex-col sm:flex-row items-stretch gap-2 pt-1">
        <div className="relative flex-1">
          <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="password"
            placeholder="Paste your 32-character LTA AccountKey here..."
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            disabled={isConnecting}
            className="w-full pl-8 pr-3 py-1.5 text-xs font-mono rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
          />
        </div>

        <button
          type="submit"
          disabled={isConnecting || !inputKey.trim()}
          className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors shadow disabled:opacity-50 whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5"
        >
          <span>{isConnecting ? 'Verifying with LTA...' : 'Connect Live LTA Data'}</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </form>

      {/* Feedback status */}
      {feedback && (
        <div className={`p-2 rounded-lg text-xs flex items-center gap-2 ${
          feedback.type === 'success'
            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
};
