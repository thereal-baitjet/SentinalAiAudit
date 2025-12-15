import React from 'react';
import { SecurityEvent } from '../types';
import { AlertIcon, CheckCircleIcon } from './Icons';

interface EventCardProps {
  event: SecurityEvent;
  onClick: (timestamp: string) => void;
  isActive: boolean;
}

const EventCard: React.FC<EventCardProps> = ({ event, onClick, isActive }) => {
  const getSeverityColor = (severity: number) => {
    if (severity >= 5) return 'border-l-red-500 hover:bg-red-950/20';
    if (severity >= 3) return 'border-l-yellow-500 hover:bg-yellow-950/20';
    return 'border-l-green-500 hover:bg-green-950/20';
  };

  const getSeverityBadge = (severity: number) => {
    if (severity >= 5) return <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Critical</span>;
    if (severity >= 3) return <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Suspicious</span>;
    return <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Routine</span>;
  };

  return (
    <button
      onClick={() => onClick(event.timestamp)}
      className={`w-full text-left group flex flex-col gap-2 p-4 rounded-r-lg border-l-4 transition-all duration-200 border-y border-r border-zinc-800 bg-zinc-900/50 
        ${getSeverityColor(event.severity)}
        ${isActive ? 'bg-zinc-800 ring-1 ring-zinc-700' : ''}
      `}
    >
      <div className="flex w-full justify-between items-start">
        <div className="flex items-center gap-2">
           <span className="font-mono text-zinc-400 text-sm bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
             {event.timestamp}
           </span>
           {getSeverityBadge(event.severity)}
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-500">
            <span>{(event.confidence * 100).toFixed(0)}%</span>
            <CheckCircleIcon className="w-3 h-3" />
        </div>
      </div>
      
      <div>
        <h4 className="font-semibold text-zinc-100">{event.classification}</h4>
        <p className="text-sm text-zinc-400 mt-1 leading-snug line-clamp-2">{event.description}</p>
      </div>
    </button>
  );
};

export default EventCard;
