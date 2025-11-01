function showMessage(msg, type) {
    const el = document.getElementById('message');
    if (!el) return;
    el.textContent = msg;
    el.className = 'message-box show ' + type;
    setTimeout(() => el.className = 'message-box', 4000);
}
window.showMessage = showMessage;
