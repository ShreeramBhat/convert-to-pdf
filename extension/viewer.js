(function () {
  var printBtn = document.getElementById("print");
  var lightBtn = document.getElementById("theme-light");
  var darkBtn = document.getElementById("theme-dark");
  var doc = document.getElementById("doc");
  var currentTheme = "warm";

  function isDark(theme) {
    return theme === "dark";
  }

  function applyTheme(theme) {
    currentTheme = isDark(theme) ? "dark" : "warm";
    document.documentElement.classList.remove("theme-warm", "theme-light", "theme-slate", "theme-dark");
    document.documentElement.classList.add("theme-" + currentTheme);
    lightBtn.classList.toggle("active", !isDark(currentTheme));
    darkBtn.classList.toggle("active", isDark(currentTheme));
  }

  function doPrint() {
    window.print();
  }

  printBtn.addEventListener("click", doPrint);
  lightBtn.addEventListener("click", function () {
    applyTheme("warm");
  });
  darkBtn.addEventListener("click", function () {
    applyTheme("dark");
  });

  chrome.storage.local.get(["ctpPayload"], function (store) {
    var payload = store.ctpPayload;
    if (!payload || !payload.body) {
      doc.innerHTML =
        "<p style='font: 16px/1.5 sans-serif; padding: 2rem;'>Nothing to print. Export a Claude conversation from the extension popup first.</p>";
      return;
    }
    document.title = payload.title || "Claude conversation";
    var st = document.createElement("style");
    st.textContent = payload.css || "";
    document.head.appendChild(st);
    doc.innerHTML = payload.body;
    applyTheme(payload.theme || "warm");

    var wait = Promise.all(
      Array.prototype.map.call(document.images, function (img) {
        return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
      })
    );
    wait.then(function () {
      if (payload.autoPrint !== false) {
        setTimeout(doPrint, 350);
      }
    });
  });
})();
