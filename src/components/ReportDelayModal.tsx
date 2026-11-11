import React, { useState } from 'react';
import { BusStop, UserReportedDelay } from '../types.ts';
import { X, AlertTriangle, Send } from 'lucide-react';

interface ReportDelayModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStop: BusStop;
  onSubmit: (report: Partial<UserReportedDelay>) => Promise<void>;
}

export const ReportDelayModal: React.FC<ReportDelayModalProps> = ({
  isOpen,
  onClose,
  currentStop,
  onSubmit
}) => {
  const [serviceNo, setServiceNo] = useState<string>('');
  const [delayType, setDelayType] = useState<UserReportedDelay['type']>('traffic_congestion');
  const [delayMinutes, setDelayMinutes] = useState<number>(10);
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('Please provide a brief description of the delay.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onSubmit({
        busStopCode: currentStop.code,
        busStopDescription: `${currentStop.description} (${currentStop.roadName})`,
        serviceNo: serviceNo.trim() || undefined,
        type: delayType,
        estimatedDelayMinutes: delayMinutes,
        description: description.trim(),
        latitude: currentStop.latitude,
        longitude: currentStop.longitude
      });
      // reset form
      setDescription('');
      setServiceNo('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Report Commuter Delay</h3>
              <p className="text-[11px] text-slate-400">Help fellow commuters adjust their route</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Current Stop info */}
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <span className="text-slate-400 text-[11px]">Bus Stop: </span>
            <span className="font-semibold text-slate-200">{currentStop.description}</span>
            <span className="font-mono text-emerald-400 ml-1">#{currentStop.code}</span>
          </div>

          {/* Optional Bus Service */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Bus Service No. <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 15, 36, 196"
              value={serviceNo}
              onChange={(e) => setServiceNo(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Issue Type */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Type of Delay
            </label>
            <select
              value={delayType}
              onChange={(e) => setDelayType(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="traffic_congestion">Traffic Congestion / Heavy Jam</option>
              <option value="heavy_crowd">Severe Crowd at Bus Stop</option>
              <option value="breakdown">Bus Breakdown / Obstacle</option>
              <option value="bad_weather">Bad Weather / Flash Flood</option>
              <option value="route_detour">Route Detour / Roadworks</option>
              <option value="long_wait">Unusual Gap / Long Waiting Time</option>
            </select>
          </div>

          {/* Estimated Delay */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Estimated Delay Added
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 25].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDelayMinutes(mins)}
                  className={`py-1.5 text-xs font-mono font-semibold rounded-lg border transition-all ${
                    delayMinutes === mins
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  +{mins} min
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Details for Commuters
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Right lane closed due to tree branch clearing; buses crawling near junction."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-emerald-500 placeholder-slate-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting...' : 'Post Delay Alert'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
