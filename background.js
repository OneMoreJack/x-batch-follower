
/**
 * Background Service Worker
 */

let activeTask = null;

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_TASK') {
      startProcessing(message.accounts);
    } else if (message.type === 'STOP_TASK') {
      activeTask = null;
    }
  });
}

async function startProcessing(accounts) {
  activeTask = {
    accounts: accounts.map(a => ({ ...a, status: 'pending' })),
    currentIndex: 0,
    stats: { success: 0, skipped: 0, failed: 0, total: accounts.length }
  };

  await processNext();
}

async function processNext() {
  if (!activeTask || activeTask.currentIndex >= activeTask.accounts.length) {
    if (activeTask) {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'TASK_COMPLETE',
          accounts: activeTask.accounts,
          stats: activeTask.stats
        }).catch(() => {});
      }
      
      // Clear persistent state if done
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.remove('taskState');
      }
    }
    activeTask = null;
    return;
  }

  const account = activeTask.accounts[activeTask.currentIndex];
  account.status = 'processing';
  
  // Update UI and save progress
  updateUIAndStorage();

  try {
    const result = await followOnX(account.username);
    
    if (result.status === 'success') {
      account.status = 'success';
      activeTask.stats.success++;
    } else if (result.status === 'skipped') {
      account.status = 'skipped';
      activeTask.stats.skipped++;
    } else {
      account.status = 'failed';
      account.error = result.error || 'Unknown error';
      activeTask.stats.failed++;
    }
  } catch (err) {
    account.status = 'failed';
    account.error = err.message;
    activeTask.stats.failed++;
  }

  activeTask.currentIndex++;
  updateUIAndStorage();

  if (activeTask && activeTask.currentIndex < activeTask.accounts.length) {
    // Randomized delay 10-15s to prevent ban
    const delay = Math.floor(Math.random() * 5000) + 10000;
    setTimeout(processNext, delay);
  } else {
    processNext();
  }
}

function updateUIAndStorage() {
  if (!activeTask || typeof chrome === 'undefined') return;
  
  const payload = {
    type: 'UPDATE_PROGRESS',
    accounts: activeTask.accounts,
    currentIndex: activeTask.currentIndex,
    stats: activeTask.stats
  };
  
  if (chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage(payload).catch(() => {
      // Popup might be closed, that's fine
    });
  }

  if (chrome.storage?.local) {
    chrome.storage.local.set({ 
      taskState: {
        accounts: activeTask.accounts,
        currentIndex: activeTask.currentIndex,
        stats: activeTask.stats,
        isProcessing: true
      }
    });
  }
}

/**
 * Core Automation Logic
 */
async function followOnX(username) {
  if (typeof chrome === 'undefined' || !chrome.tabs?.create) {
    return { status: 'failed', error: 'Extension environment missing' };
  }

  return new Promise(async (resolve) => {
    // 1. Create tab silently
    const tab = await chrome.tabs.create({ 
      url: `https://x.com/${username}`, 
      active: false 
    });

    // 2. Wait for tab to load
    let tabLoaded = false;
    const checkLoad = setInterval(async () => {
      const t = await chrome.tabs.get(tab.id);
      if (t.status === 'complete') {
        clearInterval(checkLoad);
        tabLoaded = true;
        executeAutomation();
      }
    }, 1000);

    // Timeout after 30s
    const timeout = setTimeout(() => {
      clearInterval(checkLoad);
      if (!tabLoaded) {
        chrome.tabs.remove(tab.id);
        resolve({ status: 'failed', error: 'Page load timeout' });
      }
    }, 30000);

    async function executeAutomation() {
      try {
        // Inject script to check login and follow
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['execute.js']
        });

        clearTimeout(timeout);
        chrome.tabs.remove(tab.id);

        if (results && results[0]?.result) {
          resolve(results[0].result);
        } else {
          resolve({ status: 'failed', error: 'Script injection failed' });
        }
      } catch (err) {
        clearTimeout(timeout);
        chrome.tabs.remove(tab.id);
        resolve({ status: 'failed', error: err.message });
      }
    }
  });
}
