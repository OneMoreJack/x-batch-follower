
/**
 * Content Script to extract X usernames from the DOM
 */
(function() {
  const links = Array.from(document.querySelectorAll('a[href]'));
  const xUsernameRegex = /^(?:https?:\/\/(?:www\.)?(?:x|twitter)\.com\/)?([a-zA-Z0-9_]{1,15})(?:\/.*)?$/i;
  
  // System/ignored paths on X
  const excludedPaths = [
    'home', 'explore', 'notifications', 'messages', 'i', 'search', 
    'settings', 'compose', 'tos', 'privacy', 'about', 'help', 
    'business', 'status', 'intent', 'share', 'hashtag', 'search-advanced',
    'search-live', 'login', 'signup', 'account'
  ];

  const usernames = links
    .map(link => {
      const href = link.href;
      const match = href.match(xUsernameRegex);
      if (match && match[1]) {
        const username = match[1].toLowerCase();
        if (!excludedPaths.includes(username) && isNaN(username)) {
          return match[1];
        }
      }
      return null;
    })
    .filter((v, i, a) => v && a.indexOf(v) === i); // Unique only

  return usernames;
})();
