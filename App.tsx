
import React, { useState, useEffect, useMemo } from 'react';
import { Account, TaskStats, MessageType } from './types';

declare const chrome: any;

const App: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [stats, setStats] = useState<TaskStats>({ success: 0, skipped: 0, failed: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  const hasChromeApi = typeof chrome !== 'undefined' && !!chrome.runtime?.id;
  const selectedCount = useMemo(() => accounts.filter(a => a.selected).length, [accounts]);
  const allSelected = useMemo(() => accounts.length > 0 && accounts.every(a => a.selected), [accounts]);

  useEffect(() => {
    if (!hasChromeApi) return;

    chrome.storage?.local.get(['taskState'], (result: any) => {
      if (result.taskState) {
        setAccounts(result.taskState.accounts || []);
        setIsProcessing(result.taskState.isProcessing || false);
        setCurrentIndex(result.taskState.currentIndex || -1);
        setStats(result.taskState.stats || { success: 0, skipped: 0, failed: 0, total: 0 });
        setHasScanned(true);
      }
    });

    const listener = (message: any) => {
      if (message.type === MessageType.UPDATE_PROGRESS) {
        setAccounts(message.accounts);
        setCurrentIndex(message.currentIndex);
        setStats(message.stats);
        setIsProcessing(true);
      } else if (message.type === MessageType.TASK_COMPLETE) {
        setIsProcessing(false);
        setStats(message.stats);
        setAccounts(message.accounts);
      } else if (message.type === 'ERROR') {
        setErrorMsg(message.message);
        setIsProcessing(false);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [hasChromeApi]);

  const extractAccountsFromPage = () => {
    if (!hasChromeApi) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any) => {
      if (tabs[0]?.id) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content.js']
        }, (results: any) => {
          setHasScanned(true);
          if (results && results[0]?.result) {
            const extracted = results[0].result;
            const newAccounts: Account[] = extracted.map((item: any) => ({
              id: Math.random().toString(36).substr(2, 9),
              username: item.username,
              avatar: item.avatar || undefined,
              url: `https://x.com/${item.username}`,
              selected: true,
              status: 'pending'
            }));
            setAccounts(newAccounts);
            setErrorMsg(null);
          } else {
            setAccounts([]);
            setErrorMsg("No accounts found on this page.");
          }
        });
      }
    });
  };

  const startTask = () => {
    const selected = accounts.filter(a => a.selected);
    if (selected.length === 0 || !hasChromeApi) return;
    setIsProcessing(true);
    chrome.runtime.sendMessage({ type: MessageType.START_TASK, accounts: selected });
  };

  const stopTask = () => {
    if (hasChromeApi) chrome.runtime.sendMessage({ type: MessageType.STOP_TASK });
    setIsProcessing(false);
  };

  return (
    <div className="flex flex-col h-full bg-white text-[#0f1419] selection:bg-[#0f1419]/10">
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-[#eff3f4] bg-white z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-black rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </div>
          <span className="font-black text-base tracking-tight">Follower Pro</span>
        </div>
        {hasScanned && (
          <button 
            onClick={extractAccountsFromPage}
            disabled={isProcessing}
            className="text-xs font-bold px-3 py-1.5 rounded-full border border-[#cfd9de] hover:bg-[#0f1419]/5 transition-colors"
          >
            Rescan
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 relative">
        {!hasScanned ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-[#f7f9f9] rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <h2 className="text-xl font-black mb-2">Find your community</h2>
            <p className="text-[#536471] text-sm mb-8 leading-relaxed px-4">Extract profiles from the current tab and start building your network in bulk.</p>
            <button 
              onClick={extractAccountsFromPage}
              className="w-full bg-[#0f1419] text-white py-3.5 rounded-full font-bold text-sm hover:bg-[#272c30] transition-all shadow-sm active:scale-95"
            >
              Scan Current Page
            </button>
          </div>
        ) : (
          <>
            {/* Stats Dashboard */}
            {(isProcessing || stats.total > 0) && (
              <div className="bg-[#f7f9f9] px-4 py-3 flex justify-between items-center border-b border-[#eff3f4]">
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-[#536471]">SUCCESS</p>
                    <p className="text-sm font-black">{stats.success}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-[#536471]">FAIL</p>
                    <p className="text-sm font-black text-red-600">{stats.failed}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-[#536471]">PROGRESS</p>
                  <p className="text-sm font-black">{Math.round(((stats.success + stats.skipped + stats.failed) / (stats.total || 1)) * 100)}%</p>
                </div>
              </div>
            )}

            {/* List Header */}
            <div className="px-4 py-2 bg-white flex items-center justify-between border-b border-[#eff3f4]">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={allSelected}
                  disabled={isProcessing}
                  onChange={() => {
                    const next = !allSelected;
                    setAccounts(prev => prev.map(a => ({ ...a, selected: next })));
                  }}
                  className="w-4 h-4 rounded border-[#cfd9de] text-black focus:ring-black cursor-pointer"
                />
                <span className="text-xs font-bold text-[#536471] group-hover:text-black">Select All</span>
              </label>
              <span className="text-[10px] font-bold text-[#536471] uppercase tracking-widest">{accounts.length} Profiles</span>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto list-container">
              <ul className="divide-y divide-[#eff3f4]">
                {accounts.map((acc, idx) => (
                  <li 
                    key={acc.id} 
                    className={`flex items-center px-4 py-3 transition-colors ${currentIndex === idx ? 'bg-[#0f1419]/5' : 'hover:bg-[#f7f9f9]'}`}
                  >
                    <input
                      type="checkbox"
                      checked={acc.selected}
                      disabled={isProcessing}
                      onChange={() => setAccounts(prev => prev.map(a => a.id === acc.id ? {...a, selected: !a.selected} : a))}
                      className="w-4 h-4 rounded border-[#cfd9de] text-black focus:ring-black cursor-pointer"
                    />
                    
                    <div className="ml-3 w-9 h-9 rounded-full bg-[#eff3f4] overflow-hidden shrink-0 border border-[#eff3f4]">
                      {acc.avatar ? (
                        <img src={acc.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#536471]">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </div>
                      )}
                    </div>

                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#0f1419] truncate leading-none mb-1">@{acc.username}</p>
                      <p className="text-[10px] text-[#536471] truncate">https://x.com/{acc.username}</p>
                    </div>
                    
                    <div className="ml-2 shrink-0">
                      {acc.status === 'processing' && <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>}
                      {acc.status === 'success' && <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center"><svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></div>}
                      {acc.status === 'failed' && <span className="text-red-600 font-bold text-[10px] border border-red-600 px-1 rounded">FAIL</span>}
                      {acc.status === 'skipped' && <span className="text-[#536471] font-bold text-[10px]">SKIP</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </main>

      {/* Footer Actions */}
      {hasScanned && (
        <footer className="p-4 bg-white border-t border-[#eff3f4]">
          {!isProcessing ? (
            <button
              onClick={startTask}
              disabled={selectedCount === 0}
              className="w-full bg-[#0f1419] text-white py-3 rounded-full font-black text-sm hover:bg-[#272c30] disabled:bg-[#cfd9de] transition-all active:scale-[0.98] shadow-sm"
            >
              Follow {selectedCount} Selected
            </button>
          ) : (
            <button
              onClick={stopTask}
              className="w-full bg-white text-red-600 border border-red-600/30 py-3 rounded-full font-black text-sm hover:bg-red-50 transition-all"
            >
              Stop Processing
            </button>
          )}
        </footer>
      )}

      {errorMsg && (
        <div className="absolute bottom-20 left-4 right-4 bg-black text-white text-xs p-3 rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-2">
          {errorMsg}
        </div>
      )}
    </div>
  );
};

export default App;
