
/**
 * Script injected into X profile page to perform follow
 * Supports all languages by using regex on aria-labels and targeting specific user IDs
 */
(async function() {
  // 1. Check login state
  if (document.querySelector('a[href="/login"]')) {
    return { status: 'failed', error: 'Please login to X first' };
  }

  // 2. Identify the target username from the URL (e.g., /lennysan)
  const pathParts = window.location.pathname.split('/');
  const targetUsername = pathParts[1]?.toLowerCase();
  
  if (!targetUsername) {
    return { status: 'failed', error: 'Could not determine target username from URL' };
  }

  /**
   * Helper to find the main Follow button
   * We look for buttons that:
   * - Have an aria-label containing the target username
   * - Don't look like "unfollow" or "following" buttons
   * - Priority given to buttons with specific data-testids
   */
  async function findMainFollowButton(timeout = 15000) {
    const start = Date.now();
    
    // Keywords for "Following" state in various languages to detect "already followed"
    // EN: Following, ZH: 正在关注/跟隨中, JP: フォロー中, KR: 팔로잉
    const followingPatterns = [
      'following', '正在关注', '正在跟隨', 'フォロー中', '팔로잉', 'abonné'
    ];

    while (Date.now() - start < timeout) {
      const buttons = Array.from(document.querySelectorAll('[role="button"]'));
      
      // First, check if we are ALREADY following this specific user
      const isAlreadyFollowing = buttons.some(b => {
        const label = (b.getAttribute('aria-label') || '').toLowerCase();
        const testId = b.getAttribute('data-testid') || '';
        const isTargetUser = label.includes(`@${targetUsername}`) || label.includes(targetUsername);
        
        const hasFollowingText = followingPatterns.some(p => label.includes(p.toLowerCase()));
        const isUnfollowId = testId.includes('unfollow');
        
        return isTargetUser && (hasFollowingText || isUnfollowId);
      });

      if (isAlreadyFollowing) return 'already_following';

      // Second, find the "Follow" button for this specific user
      // We look for aria-labels like "Follow @username", "关注 @username", etc.
      const followBtn = buttons.find(b => {
        const label = (b.getAttribute('aria-label') || '').toLowerCase();
        const testId = (b.getAttribute('data-testid') || '').toLowerCase();
        
        // Must contain the username to ensure it's not a sidebar recommendation
        const isTargetUser = label.includes(`@${targetUsername}`) || label.includes(targetUsername);
        
        // Must NOT be following already
        const isFollowAction = !followingPatterns.some(p => label.includes(p.toLowerCase())) && !testId.includes('unfollow');
        
        // Usually buttons have data-testid ending in "-follow"
        const hasFollowId = testId.endsWith('-follow');

        return isTargetUser && (isFollowAction || hasFollowId);
      });

      if (followBtn) {
        // Ensure the button is visible and not disabled
        const rect = followBtn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return followBtn;
      }

      await new Promise(r => setTimeout(r, 800)); // Polling
    }
    return null;
  }

  // 3. Execution
  const result = await findMainFollowButton();

  if (result === 'already_following') {
    return { status: 'skipped', message: 'Already followed or pending' };
  }

  if (result && typeof result !== 'string') {
    try {
      // Use both click() and dispatching events to be sure
      result.click();
      result.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      result.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      
      // Brief wait to ensure X registers the follow before tab closes
      await new Promise(r => setTimeout(r, 2000));
      
      return { status: 'success' };
    } catch (e) {
      return { status: 'failed', error: 'Click failed: ' + e.message };
    }
  }

  return { status: 'failed', error: `Follow button for @${targetUsername} not found` };
})();
