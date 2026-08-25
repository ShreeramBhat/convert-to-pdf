chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
  if (!msg || msg.type !== "OPEN_VIEWER") return;
  chrome.tabs.create({ url: chrome.runtime.getURL("viewer.html") }, function () {
    sendResponse({ ok: true });
  });
  return true;
});
