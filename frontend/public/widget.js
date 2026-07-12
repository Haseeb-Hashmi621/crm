/**
 * widget.js — Zahra embeddable chat widget
 * Usage: <script src="https://YOUR-CRM-BACKEND/static/widget.js"
 *                 data-api="https://YOUR-CRM-BACKEND/website-chat/message" defer></script>
 */
(function () {
    var scriptTag = document.currentScript;
    var API_URL = scriptTag.getAttribute("data-api") || "http://127.0.0.1:8000/website-chat/message";
    var sessionId = "sess-" + Math.random().toString(36).slice(2) + Date.now();
    var history = [];
    var open = false;
  
    var btn = document.createElement("div");
    btn.innerHTML = "💬";
    btn.style.cssText = "position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;background:#16a34a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);z-index:999998;";
    document.body.appendChild(btn);
  
    var panel = document.createElement("div");
    panel.style.cssText = "position:fixed;bottom:88px;right:20px;width:340px;max-width:90vw;height:460px;max-height:70vh;background:#fff;border-radius:16px;box-shadow:0 12px 32px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden;z-index:999999;font-family:Arial,sans-serif;";
    panel.innerHTML =
      '<div style="background:#16a34a;color:#fff;padding:14px 16px;font-weight:600;">Zahra — Setup in Oman</div>' +
      '<div id="zahra-msgs" style="flex:1;overflow-y:auto;padding:12px;font-size:14px;background:#f7f7f8;"></div>' +
      '<div style="display:flex;border-top:1px solid #eee;">' +
        '<input id="zahra-input" placeholder="Type a message..." style="flex:1;border:none;padding:12px;font-size:14px;outline:none;">' +
        '<button id="zahra-send" style="background:#16a34a;color:#fff;border:none;padding:0 16px;cursor:pointer;">Send</button>' +
      '</div>';
    document.body.appendChild(panel);
  
    var msgsEl = panel.querySelector("#zahra-msgs");
    var inputEl = panel.querySelector("#zahra-input");
    var sendEl = panel.querySelector("#zahra-send");
  
    function addBubble(role, text) {
      var b = document.createElement("div");
      var isUser = role === "user";
      b.style.cssText = "margin-bottom:8px;display:flex;justify-content:" + (isUser ? "flex-end" : "flex-start") + ";";
      var inner = document.createElement("div");
      inner.style.cssText = "max-width:80%;padding:8px 12px;border-radius:12px;line-height:1.4;" +
        (isUser ? "background:#16a34a;color:#fff;" : "background:#fff;color:#111;border:1px solid #e5e5e5;");
      inner.textContent = text;
      b.appendChild(inner);
      msgsEl.appendChild(b);
      msgsEl.scrollTop = msgsEl.scrollHeight;
    }
  
    function greet() {
      if (history.length === 0) {
        addBubble("assistant", "Good day. This is Zahra from Setup in Oman. How may I help you with your company setup in the Sultanate of Oman?");
      }
    }
  
    btn.addEventListener("click", function () {
      open = !open;
      panel.style.display = open ? "flex" : "none";
      if (open) { greet(); inputEl.focus(); }
    });
  
    function send() {
      var text = inputEl.value.trim();
      if (!text) return;
      addBubble("user", text);
      history.push({ role: "user", content: text });
      inputEl.value = "";
      sendEl.disabled = true;
  
      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, messages: history }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          addBubble("assistant", data.reply);
          history.push({ role: "assistant", content: data.reply });
        })
        .catch(function () {
          addBubble("assistant", "Sorry, something went wrong. Please try again or WhatsApp us at +968 9596 3381.");
        })
        .finally(function () { sendEl.disabled = false; });
    }
  
    sendEl.addEventListener("click", send);
    inputEl.addEventListener("keydown", function (e) { if (e.key === "Enter") send(); });
  })();