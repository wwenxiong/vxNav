document.addEventListener("DOMContentLoaded", () => {
  const titleInput = document.getElementById("title");
  const urlInput = document.getElementById("url");
  const saveBtn = document.getElementById("saveBtn");

  // Query active tab in current window
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      const activeTab = tabs[0];
      titleInput.value = activeTab.title || "";
      urlInput.value = activeTab.url || "";
    }
  });

  saveBtn.addEventListener("click", () => {
    const url = urlInput.value;
    const title = titleInput.value;
    if (!url) return;

    // Default to localhost:3000, or user-configured address
    const navOrigin = "http://localhost:3000";
    const target = `${navOrigin}/?quick_add=1&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

    chrome.tabs.create({ url: target });
    window.close();
  });
});
