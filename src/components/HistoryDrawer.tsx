import React, { useState } from 'react';
import {
  History,
  FolderGit2,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Copy,
} from 'lucide-react';
import { ActionLogItem, PathHistoryEntry } from '../types';

interface HistoryDrawerProps {
  pathHistory: PathHistoryEntry[];
  actionLogs: ActionLogItem[];
  onJumpToFolder: (folderId: string | null) => void;
  onUndoAction: (logId: string) => void;
  onClearLogs: () => void;
  onPlayBlip: (pitch?: number) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  pathHistory,
  actionLogs,
  onJumpToFolder,
  onUndoAction,
  onClearLogs,
  onPlayBlip,
}) => {
  // Collapsed by default to preserve 25%+ breathing room
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'actions' | 'errors' | 'paths'>(
    'actions'
  );

  const isLogUndoable = (log: ActionLogItem) =>
    !log.undone &&
    log.actionType !== 'error' &&
    Boolean(
      (log.diskOps && log.diskOps.length > 0) ||
        (log.undoSnapshot && log.undoSnapshot.length > 0)
    );

  const latestUndoable = actionLogs.find(isLogUndoable);
  const errorLogs = actionLogs.filter((l) => l.actionType === 'error');
  const displayedLogs = activeTab === 'errors' ? errorLogs : actionLogs;

  const copyErrorEntry = async (log: ActionLogItem) => {
    onPlayBlip(1.15);
    const report = `[${log.timestamp}] [${log.errorCode || 'ERR'}] ${
      log.summary
    }${log.errorDetails ? ` | Details: ${log.errorDetails}` : ''}${
      log.fromPath ? ` | Path: ${log.fromPath}` : ''
    }`;
    try {
      await navigator.clipboard.writeText(report);
    } catch {
      // Ignore clipboard permission warning
    }
  };

  return (
    <footer className="border-t-2 border-[var(--border-color,#17181c)] bg-[var(--bg-secondary)] select-none z-20">
      <div className="px-3 py-1.5 flex items-center justify-between gap-2 bg-black/25">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              onPlayBlip(1.0);
              setExpanded((e) => !e);
            }}
            className="px-2.5 py-0.5 ps1-button bg-[var(--accent-primary)] text-[#17181c] font-pixel text-[10px] font-bold flex items-center gap-1"
          >
            {expanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronUp className="w-3 h-3" />
            )}
            <span>HISTORY & ERROR LOG</span>
          </button>

          <button
            onClick={() => {
              onPlayBlip(1.1);
              setActiveTab('actions');
              setExpanded(true);
            }}
            className={`px-2 py-0.5 font-pixel text-[10px] ps1-button flex items-center gap-1 ${
              expanded && activeTab === 'actions'
                ? 'bg-[var(--accent-secondary)] text-[#17181c] font-bold'
                : 'bg-black/30 opacity-80 hover:opacity-100'
            }`}
          >
            <FolderGit2 className="w-3 h-3" />
            <span>ALL LOGS ({actionLogs.length})</span>
          </button>

          <button
            onClick={() => {
              onPlayBlip(0.95);
              setActiveTab('errors');
              setExpanded(true);
            }}
            className={`px-2 py-0.5 font-pixel text-[10px] ps1-button flex items-center gap-1 ${
              expanded && activeTab === 'errors'
                ? 'bg-[#E06C75] text-[#17181c] font-bold'
                : errorLogs.length > 0
                ? 'bg-[#E06C75]/25 text-[#E06C75] border-[#E06C75] font-bold'
                : 'bg-black/30 opacity-80 hover:opacity-100'
            }`}
            title="Inspect failed file operations (ENOENT, EACCES, invalid characters, collisions)"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>ERRORS ({errorLogs.length})</span>
          </button>

          <button
            onClick={() => {
              onPlayBlip(1.1);
              setActiveTab('paths');
              setExpanded(true);
            }}
            className={`px-2 py-0.5 font-pixel text-[10px] ps1-button flex items-center gap-1 ${
              expanded && activeTab === 'paths'
                ? 'bg-[var(--accent-secondary)] text-[#17181c] font-bold'
                : 'bg-black/30 opacity-80 hover:opacity-100'
            }`}
          >
            <History className="w-3 h-3" />
            <span>VISITED PATHS ({pathHistory.length})</span>
          </button>
        </div>

        {/* Latest Action/Error Summary + Instant Undo Button */}
        <div className="flex items-center gap-2 min-w-0">
          {actionLogs[0] && (
            <span
              className={`font-mono text-[11px] truncate max-w-md hidden sm:inline ${
                actionLogs[0].actionType === 'error'
                  ? 'text-[#E06C75] font-bold'
                  : 'opacity-80'
              }`}
            >
              [{actionLogs[0].timestamp}]{' '}
              {actionLogs[0].actionType === 'error' &&
              actionLogs[0].errorCode
                ? `[${actionLogs[0].errorCode}] `
                : ''}
              {actionLogs[0].summary}
            </span>
          )}

          {latestUndoable && (
            <button
              onClick={() => onUndoAction(latestUndoable.id)}
              className="px-2 py-0.5 ps1-button bg-[#E0B85A] text-[#17181c] font-pixel text-[10px] font-bold flex items-center gap-1 shrink-0"
              title={`Undo: ${latestUndoable.summary}`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>UNDO LAST MOVE</span>
            </button>
          )}

          {expanded && (
            <button
              onClick={onClearLogs}
              className="px-2 py-0.5 text-[10px] font-mono ps1-button bg-black/30 hover:bg-black/50 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="h-[148px] overflow-y-auto px-3 py-2 font-mono text-xs space-y-1 bg-black/25 border-t border-[var(--border-color,#17181c)]">
          {activeTab === 'actions' || activeTab === 'errors' ? (
            displayedLogs.length === 0 ? (
              <div className="text-[11px] opacity-60 py-4 text-center">
                {activeTab === 'errors'
                  ? 'No file system or operation errors recorded in this session.'
                  : 'No file movements or errors logged yet.'}
              </div>
            ) : (
              displayedLogs.map((log) => {
                const isError = log.actionType === 'error';
                return (
                  <div
                    key={log.id}
                    className={`flex items-center justify-between gap-2 py-1 px-2.5 border text-[11px] ${
                      isError
                        ? 'bg-[#E06C75]/15 border-[#E06C75]/60 text-[#EAE6DF]'
                        : 'bg-black/25 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[10px] opacity-60 shrink-0">
                        [{log.timestamp}]
                      </span>
                      <span
                        className="px-1.5 py-0.2 text-[9px] font-pixel uppercase border border-[#17181c] text-[#17181c] font-bold shrink-0"
                        style={{
                          backgroundColor: isError
                            ? '#E06C75'
                            : log.actionType === 'move'
                            ? '#D8A7B1'
                            : log.actionType === 'sort'
                            ? '#E0B85A'
                            : log.actionType === 'tag'
                            ? '#B6A6CA'
                            : log.actionType === 'theme'
                            ? '#61AFEF'
                            : '#9CC5A1',
                        }}
                      >
                        {log.actionType}
                      </span>

                      {isError && log.errorCode && (
                        <span className="px-1 py-0.2 bg-black/45 border border-[#E06C75]/60 text-[#E06C75] font-mono text-[9px] font-bold shrink-0">
                          {log.errorCode}
                        </span>
                      )}

                      <div className="min-w-0 flex-1 truncate">
                        <span
                          className={`${
                            log.undone ? 'line-through opacity-50' : ''
                          } ${isError ? 'text-[#F7768E] font-semibold' : ''}`}
                        >
                          {log.summary}
                        </span>
                        {log.errorDetails && (
                          <span className="ml-2 text-[10px] opacity-75">
                            — {log.errorDetails}
                          </span>
                        )}
                        {log.fromPath && (
                          <span className="ml-2 text-[10px] opacity-60">
                            ({log.fromPath})
                          </span>
                        )}
                      </div>
                    </div>

                    {isError && (
                      <button
                        type="button"
                        onClick={() => copyErrorEntry(log)}
                        className="px-1.5 py-0.5 ps1-button bg-black/40 hover:bg-black/65 font-pixel text-[8px] flex items-center gap-1 shrink-0"
                        title="Copy error log entry to clipboard"
                      >
                        <Copy className="w-2.5 h-2.5" />
                        <span>COPY</span>
                      </button>
                    )}

                    {isLogUndoable(log) && (
                      <button
                        onClick={() => onUndoAction(log.id)}
                        className="px-2 py-0.5 ps1-button bg-[#E0B85A] text-[#17181c] font-pixel text-[9px] font-bold flex items-center gap-1 shrink-0"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>UNDO</span>
                      </button>
                    )}
                    {log.undone && (
                      <span className="text-[10px] font-pixel opacity-50">
                        [UNDONE]
                      </span>
                    )}
                  </div>
                );
              })
            )
          ) : pathHistory.length === 0 ? (
            <div className="text-[11px] opacity-55 py-4 text-center">
              No directories visited yet.
            </div>
          ) : (
            pathHistory.map((entry) => (
              <button
                key={entry.id}
                onClick={() => onJumpToFolder(entry.folderId)}
                className="w-full text-left flex items-center justify-between py-1 px-2.5 bg-black/25 hover:bg-[var(--accent-primary)] hover:text-[#17181c] border border-white/10 text-[11px] transition-colors group"
              >
                <div className="flex items-center gap-2 truncate">
                  <CornerDownRight className="w-3.5 h-3.5 opacity-70" />
                  <span className="font-bold truncate">{entry.pathString}</span>
                </div>
                <span className="text-[10px] opacity-65 group-hover:opacity-100">
                  Visited {entry.timestamp} • [1-Click Jump]
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </footer>
  );
};
