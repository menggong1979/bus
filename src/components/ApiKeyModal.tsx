import React, { useState, useEffect } from 'react';
import { X, Key, CheckCircle, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { getStoredAccountKey, setStoredAccountKey, testAccountKey } from '../services/api.ts';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeySaved
}) => {
  const [keyInput, setKeyInput] = useState<string>('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setKeyInput(getStoredAccountKey());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!keyInput.trim()) {
      setTestResult({ success: false, message: 'Please enter an AccountKey to test.' });
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await testAccountKey(keyInput.trim());
      setTestResult({
        success: res.success,
        message: res.message
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection failed.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    setStoredAccountKey(keyInput);
    onKeySaved();
    onClose();
  };

  const handleClear = () => {
    setKeyInput('');
    setStoredAccountKey('');
    setTestResult({ success: true, message: 'API key cleared. Switched to smart simulated Singapore feed.' });
    onKeySaved();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">LTA DataMall API Configuration</h3>
              <p className="text-[11px] text-slate-400">Singapore Land Transport Authority v3 Endpoint</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <p className="text-xs text-slate-300 leading-relaxed">
            All requests to LTA DataMall v3 (<code className="text-emerald-400 font-mono">BusArrival?BusStopCode=...</code> and <code className="text-emerald-400 font-mono">TrafficIncidents</code>) require the <code className="text-emerald-300 font-mono">AccountKey</code> HTTP header.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              AccountKey Header
            </label>
            <input
              type="password"
              placeholder="Paste your LTA DataMall AccountKey here"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Leave blank to automatically run our live-synchronized Singapore simulation engine.
            </p>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
              testResult.success
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}>
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              )}
              <span className="leading-snug">{testResult.message}</span>
            </div>
          )}

          {/* Guide callout */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400 space-y-1.5">
            <div className="font-semibold text-slate-300 flex items-center justify-between">
              <span>How to get a key?</span>
              <a
                href="https://datamall.lta.gov.sg/content/datamall/en/request-api.html"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline inline-flex items-center gap-1 text-[11px]"
              >
                <span>Request LTA Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] leading-relaxed">
              LTA DataMall accounts are free for Singapore transit developers. Once approved, copy your 32-character key from the portal and save it above.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Clear Key (Use Simulation)
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={testing || !keyInput.trim()}
              onClick={handleTestKey}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Testing...' : 'Test Key'}</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm"
            >
              Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
