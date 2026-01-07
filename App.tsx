
import React, { useState, useEffect } from 'react';
import { Account, TaskStats, MessageType } from './types';

// Fix: Declare chrome as a global variable
declare const chrome: any;

const App: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [stats, setStats] = useState<TaskStats>({ success: 0, skipped: 0, failed: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  const hasChromeApi = typeof chrome !== 'undefined' && !!chrome.runtime?.id;

  useEffect(() => {
    if (!hasChromeApi) return;

    // Load initial state
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
      console.log('Popup received message:', message);
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
            const extracted: string[] = results[0].result;
            const newAccounts: Account[] = extracted.map(username => ({
              id: Math.random().toString(36).substr(2, 9),
              username,
              url: `https://x.com/${username}`,
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

    setErrorMsg(null);
    setIsProcessing(true);
    
    chrome.runtime.sendMessage({
      type: MessageType.START_TASK,
      accounts: selected
    });
  };

  const stopTask = () => {
    if (hasChromeApi) {
      chrome.runtime.sendMessage({ type: MessageType.STOP_TASK });
    }
    setIsProcessing(false);
  };

  return (
    <div className="flex flex-col h-full bg-white text-[#0f1419] font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-[#eff3f4] px-4 py-3 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </div>
          <h1 className="font-bold text-lg">X Follower Pro</h1>
        </div>
        {hasScanned && (
          <button 
            onClick={extractAccountsFromPage}
            disabled={isProcessing}
            className="text-[#1d9bf0] hover:underline text-sm font-bold disabled:opacity-50"
          >
            Rescan
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {!hasChromeApi && (
          <div className="bg-amber-50 border border-amber-100 text-amber-800 px-4 py-3 rounded-2xl text-xs">
            <b>Environment Notice:</b> This is a preview. To use the tool, build the project and load the <code>dist</code> folder into Chrome.
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-medium">
            {errorMsg}
          </div>
        )}

        {!hasScanned && (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-6">
            <div className="w-20 h-20 bg-[#f7f9f9] text-[#1d9bf0] rounded-full flex items-center justify-center">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold">Find accounts</h2>
              <p className="text-sm text-[#536471]">Extract X profiles from links on the current page.</p>
            </div>
            <button 
              onClick={extractAccountsFromPage}
              className="w-full bg-[#1d9bf0] text-white py-3 rounded-full font-bold hover:bg-[#1a8cd8] transition-colors"
            >
              Scan Current Page
            </button>
          </div>
        )}

        {hasScanned && (isProcessing || stats.total > 0) && (
          <div className="bg-white rounded-2xl border border-[#eff3f4] p-4 grid grid-cols-4 gap-2 text-center shadow-sm">
            <div className="flex flex-col"><span className="text-[10px] font-bold text-[#536471]">TOTAL</span><span className="text-lg font-black">{stats.total}</span></div>
            <div className="flex flex-col"><span className="text-[10px] font-bold text-[#00ba7c]">DONE</span><span className="text-lg font-black text-[#00ba7c]">{stats.success}</span></div>
            <div className="flex flex-col"><span className="text-[10px] font-bold text-[#536471]">SKIP</span><span className="text-lg font-black">{stats.skipped}</span></div>
            <div className="flex flex-col"><span className="text-[10px] font-bold text-[#f4212e]">FAIL</span><span className="text-lg font-black text-[#f4212e]">{stats.failed}</span></div>
          </div>
        )}

        {isProcessing && (
          <div className="space-y-1 px-1">
            <div className="w-full bg-[#eff3f4] rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-[#1d9bf0] h-full transition-all duration-500" 
                style={{ width: `${((stats.success + stats.skipped + stats.failed) / stats.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {hasScanned && (
          <div className="bg-white rounded-2xl border border-[#eff3f4] overflow-hidden shadow-sm">
            <ul className="divide-y divide-[#eff3f4] max-h-[300px] overflow-y-auto">
              {accounts.map((acc, idx) => (
                <li key={acc.id} className={`flex items-center px-4 py-3 hover:bg-[#f7f9f9] ${currentIndex === idx ? 'bg-[#1d9bf0]/5' : ''}`}>
                  <input
                    type="checkbox"
                    checked={acc.selected}
                    disabled={isProcessing}
                    onChange={() => setAccounts(prev => prev.map(a => a.id === acc.id ? {...a, selected: !a.selected} : a))}
                    className="w-5 h-5 rounded border-[#cfd9de] text-[#1d9bf0]"
                  />
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">@{acc.username}</p>
                  </div>
                  <div className="ml-2">
                    {acc.status === 'processing' && <div className="w-4 h-4 border-2 border-[#1d9bf0] border-t-transparent rounded-full animate-spin"></div>}
                    {acc.status === 'success' && <span className="text-[#00ba7c]">✅</span>}
                    {acc.status === 'failed' && <span className="text-[#f4212e] text-xs font-bold">Error</span>}
                    {acc.status === 'skipped' && <span className="text-[#536471] text-xs">Skip</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {hasScanned && (
        <footer className="bg-white border-t border-[#eff3f4] p-4 sticky bottom-0 z-10">
          {!isProcessing ? (
            <button
              onClick={startTask}
              disabled={accounts.filter(a => a.selected).length === 0}
              className="w-full bg-[#0f1419] text-white py-3 rounded-full font-bold hover:bg-[#272c30] disabled:bg-[#8e99a1]"
            >
              Follow Selected ({accounts.filter(a => a.selected).length})
            </button>
          ) : (
            <button
              onClick={stopTask}
              className="w-full bg-white text-[#f4212e] border border-[#f4212e]/30 py-3 rounded-full font-bold hover:bg-[#f4212e]/5"
            >
              Stop Task
            </button>
          )}
        </footer>
      )}
    </div>
  );
};

export default App;
