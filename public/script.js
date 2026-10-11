// ==========================================================
// Gemini Multimodal AI Studio - Frontend Logic
// ==========================================================

// DOM Elements
const chatBox = document.getElementById('chat-box');
const chatContainer = document.getElementById('chat-container');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const btnSend = document.getElementById('btn-send');
const btnClear = document.getElementById('btn-clear');
const welcomeCard = document.getElementById('welcome-card');

// Hidden File Inputs
const imageInput = document.getElementById('image-input');
const docInput = document.getElementById('doc-input');
const audioInput = document.getElementById('audio-input');

// Action Trigger Buttons
const btnTriggerImage = document.getElementById('btn-trigger-image');
const btnTriggerDoc = document.getElementById('btn-trigger-doc');
const btnTriggerAudio = document.getElementById('btn-trigger-audio');
const btnTriggerMic = document.getElementById('btn-trigger-mic');

// Attachment Preview Drawer
const attachmentPreview = document.getElementById('attachment-preview');
const previewThumb = document.getElementById('preview-thumb');
const previewType = document.getElementById('preview-type');
const previewName = document.getElementById('preview-name');
const btnRemoveAttachment = document.getElementById('btn-remove-attachment');

// Voice Recording Elements
const recordingBar = document.getElementById('recording-bar');
const recordingTimer = document.getElementById('recording-timer');
const btnCancelRecord = document.getElementById('btn-cancel-record');
const btnStopRecord = document.getElementById('btn-stop-record');

// Image Modal (Lightbox)
const imageModal = document.getElementById('image-modal');
const modalImg = document.getElementById('modal-img');
const modalClose = document.getElementById('modal-close');

// Suggestion Chips
const chipImage = document.getElementById('chip-image');
const chipDoc = document.getElementById('chip-doc');
const chipVoice = document.getElementById('chip-voice');
const chipChat = document.getElementById('chip-chat');

// Sidebar Elements
const appSidebar = document.getElementById('app-sidebar');
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
const btnCloseSidebar = document.getElementById('btn-close-sidebar');
const sideActionImage = document.getElementById('side-action-image');
const sideActionDoc = document.getElementById('side-action-doc');
const sideActionVoice = document.getElementById('side-action-voice');
const sessionAttachmentsList = document.getElementById('session-attachments-list');
const statMessageCount = document.getElementById('stat-message-count');
const statAttachCount = document.getElementById('stat-attach-count');
const btnExportChat = document.getElementById('btn-export-chat');
const btnSideClear = document.getElementById('btn-side-clear');

// State
let conversation = [];
let currentAttachment = null; // { type: 'image'|'doc'|'audio', file: File|Blob, name: string, previewUrl?: string }
let mediaRecorder = null;
let audioChunks = [];
let recordInterval = null;
let recordSeconds = 0;
let totalMessages = 0;
let totalAttachments = 0;
const sessionVault = []; // { type, name, url }

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  autoResizeTextarea();
  updateStats();
});

function setupEventListeners() {
  // Input trigger clicks
  btnTriggerImage.addEventListener('click', () => imageInput.click());
  btnTriggerDoc.addEventListener('click', () => docInput.click());
  btnTriggerAudio.addEventListener('click', () => audioInput.click());
  btnTriggerMic.addEventListener('click', startVoiceRecording);

  // File change handlers
  imageInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0], 'image'));
  docInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0], 'doc'));
  audioInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0], 'audio'));

  // Remove Attachment
  btnRemoveAttachment.addEventListener('click', clearAttachment);

  // Recording actions
  btnCancelRecord.addEventListener('click', cancelVoiceRecording);
  btnStopRecord.addEventListener('click', stopVoiceRecording);

  // Clear Chat
  btnClear.addEventListener('click', resetChat);
  if (btnSideClear) btnSideClear.addEventListener('click', resetChat);

  // Sidebar Controls
  if (btnToggleSidebar) {
    btnToggleSidebar.addEventListener('click', () => {
      if (window.innerWidth <= 900) {
        appSidebar.classList.toggle('open-mobile');
      } else {
        appSidebar.classList.toggle('collapsed');
      }
    });
  }

  if (btnCloseSidebar) {
    btnCloseSidebar.addEventListener('click', () => {
      appSidebar.classList.remove('open-mobile');
    });
  }

  // Sidebar Quick Actions
  if (sideActionImage) sideActionImage.addEventListener('click', () => imageInput.click());
  if (sideActionDoc) sideActionDoc.addEventListener('click', () => docInput.click());
  if (sideActionVoice) sideActionVoice.addEventListener('click', startVoiceRecording);

  // Export Chat
  if (btnExportChat) btnExportChat.addEventListener('click', exportChatTranscript);

  // Form submit
  chatForm.addEventListener('submit', handleFormSubmit);

  // Keyboard shortcut in textarea: Enter to send, Shift+Enter for new line
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatForm.requestSubmit();
    }
  });

  userInput.addEventListener('input', autoResizeTextarea);

  // Lightbox close
  modalClose.addEventListener('click', () => imageModal.classList.add('hidden'));
  imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal || e.target.classList.contains('modal-backdrop')) {
      imageModal.classList.add('hidden');
    }
  });

  // Suggestion Chips
  if (chipImage) chipImage.addEventListener('click', () => imageInput.click());
  if (chipDoc) chipDoc.addEventListener('click', () => docInput.click());
  if (chipVoice) chipVoice.addEventListener('click', startVoiceRecording);
  if (chipChat) {
    chipChat.addEventListener('click', () => {
      userInput.value = 'Ceritakan ide kreatif untuk proyek teknologi terbaru.';
      userInput.focus();
      autoResizeTextarea();
    });
  }

  // Paste image from clipboard support (Ctrl+V)
  window.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (const item of items) {
      if (item.type.indexOf('image') === 0) {
        const blob = item.getAsFile();
        handleFileSelect(blob, 'image');
        break;
      }
    }
  });

  // Drag and drop files onto the window
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleFileSelect(file, 'image');
      } else if (file.type.startsWith('audio/')) {
        handleFileSelect(file, 'audio');
      } else {
        handleFileSelect(file, 'doc');
      }
    }
  });
}

// Auto-expand textarea
function autoResizeTextarea() {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
}

// Format file size
function formatBytes(bytes, decimals = 1) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

// Handle File Selection
function handleFileSelect(file, type) {
  if (!file) return;

  const previewUrl = URL.createObjectURL(file);
  currentAttachment = {
    type,
    file,
    name: file.name || `${type}_${Date.now()}`,
    size: file.size,
    previewUrl
  };

  // Render attachment preview drawer
  attachmentPreview.classList.remove('hidden');
  previewName.textContent = `${currentAttachment.name} (${formatBytes(currentAttachment.size)})`;

  if (type === 'image') {
    previewType.textContent = 'FOTO / GAMBAR';
    previewThumb.innerHTML = `<img src="${previewUrl}" alt="Preview" />`;
  } else if (type === 'doc') {
    previewType.textContent = 'DOKUMEN';
    previewThumb.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`;
  } else if (type === 'audio') {
    previewType.textContent = 'AUDIO / SUARA';
    previewThumb.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
  }

  userInput.focus();
}

function clearAttachment() {
  if (currentAttachment && currentAttachment.previewUrl) {
    // Note: Don't revoke URL immediately if it's stored in session vault
  }
  currentAttachment = null;
  attachmentPreview.classList.add('hidden');
  previewThumb.innerHTML = '';
  previewName.textContent = '';
  imageInput.value = '';
  docInput.value = '';
  audioInput.value = '';
}

// Add to Session Vault in Sidebar
function addToSessionVault(attachment) {
  if (!attachment) return;
  sessionVault.push(attachment);
  totalAttachments++;
  updateStats();

  if (sessionAttachmentsList) {
    sessionAttachmentsList.className = 'session-attachments-grid';
    const item = document.createElement('div');
    item.className = 'vault-item';

    if (attachment.type === 'image') {
      item.innerHTML = `
        <img src="${attachment.previewUrl}" class="vault-item-thumb" alt="Img" />
        <span class="vault-item-name">${escapeHtml(attachment.name)}</span>
      `;
      item.style.cursor = 'pointer';
      item.addEventListener('click', () => openImageLightbox(attachment.previewUrl));
    } else if (attachment.type === 'doc') {
      item.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
        <span class="vault-item-name">${escapeHtml(attachment.name)}</span>
      `;
    } else if (attachment.type === 'audio') {
      item.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
        <span class="vault-item-name">${escapeHtml(attachment.name)}</span>
      `;
    }

    sessionAttachmentsList.prepend(item);
  }
}

// Update UI Statistics
function updateStats() {
  if (statMessageCount) statMessageCount.textContent = totalMessages;
  if (statAttachCount) statAttachCount.textContent = totalAttachments;
}

// Voice Note Recording
async function startVoiceRecording() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Browser Anda tidak mendukung akses rekaman mikrofon.');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    
    // Tentukan mimeType yang disupport
    let options = {};
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      options = { mimeType: 'audio/webm;codecs=opus' };
    } else if (MediaRecorder.isTypeSupported('audio/webm')) {
      options = { mimeType: 'audio/webm' };
    } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
      options = { mimeType: 'audio/ogg' };
    }

    mediaRecorder = new MediaRecorder(stream, options);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();

    // UI state
    recordSeconds = 0;
    recordingTimer.textContent = '00:00';
    recordingBar.classList.remove('hidden');
    btnTriggerMic.classList.add('active-attachment');

    recordInterval = setInterval(() => {
      recordSeconds++;
      const mins = String(Math.floor(recordSeconds / 60)).padStart(2, '0');
      const secs = String(recordSeconds % 60).padStart(2, '0');
      recordingTimer.textContent = `${mins}:${secs}`;
    }, 1000);

  } catch (err) {
    console.error('Gagal mengakses mikrofon:', err);
    alert('Tidak dapat mengakses mikrofon. Pastikan izin akses telah diberikan di browser.');
  }
}

function stopVoiceRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

  clearInterval(recordInterval);
  recordingBar.classList.add('hidden');
  btnTriggerMic.classList.remove('active-attachment');

  mediaRecorder.onstop = () => {
    const mime = mediaRecorder.mimeType || 'audio/webm';
    const audioBlob = new Blob(audioChunks, { type: mime });
    const mins = String(Math.floor(recordSeconds / 60)).padStart(2, '0');
    const secs = String(recordSeconds % 60).padStart(2, '0');
    const fileName = `Voice_Note_${mins}m${secs}s.webm`;

    const file = new File([audioBlob], fileName, { type: mime });
    handleFileSelect(file, 'audio');
  };

  mediaRecorder.stop();
}

function cancelVoiceRecording() {
  if (!mediaRecorder) return;
  clearInterval(recordInterval);
  recordingBar.classList.add('hidden');
  btnTriggerMic.classList.remove('active-attachment');
  audioChunks = [];
  if (mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
}

// Reset Conversation
function resetChat() {
  conversation = [];
  clearAttachment();
  totalMessages = 0;
  totalAttachments = 0;
  sessionVault.length = 0;
  updateStats();

  if (sessionAttachmentsList) {
    sessionAttachmentsList.className = 'session-attachments-empty';
    sessionAttachmentsList.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l7.88-7.88"/></svg>
      <span>Belum ada lampiran di sesi ini</span>
    `;
  }

  chatBox.innerHTML = '';
  if (welcomeCard) {
    chatBox.appendChild(welcomeCard);
    welcomeCard.style.display = 'block';
  }
  userInput.value = '';
  autoResizeTextarea();
}

// Export Chat Transcript
function exportChatTranscript() {
  if (conversation.length === 0) {
    alert('Belum ada percakapan untuk diekspor.');
    return;
  }

  let textContent = `=== CATATAN PERCAKAPAN GEMINI AI STUDIO ===\nTanggal: ${new Date().toLocaleString('id-ID')}\n\n`;
  conversation.forEach((msg, idx) => {
    const sender = msg.role === 'user' ? 'PENGGUNA' : 'GEMINI AI';
    textContent += `[${sender}]:\n${msg.text}\n\n----------------------------------------\n\n`;
  });

  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Gemini_Chat_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Main Submit Handler
async function handleFormSubmit(e) {
  e.preventDefault();

  const textMessage = userInput.value.trim();
  const attachment = currentAttachment;

  // Jika tidak ada teks dan tidak ada lampiran, abaikan
  if (!textMessage && !attachment) return;

  // Sembunyikan welcome card jika ada
  if (welcomeCard && welcomeCard.parentNode) {
    welcomeCard.style.display = 'none';
  }

  // Tampilkan pesan pengguna di UI
  appendUserMessage(textMessage, attachment);
  totalMessages++;
  updateStats();

  if (attachment) {
    addToSessionVault(attachment);
  }

  // Bersihkan form & lampiran
  userInput.value = '';
  autoResizeTextarea();
  clearAttachment();

  // Tampilkan loading bot bubble
  const loadingElement = appendLoadingBotMessage();
  setInputState(false);

  try {
    let resultText = '';

    // Route ke endpoint yang sesuai
    if (attachment && attachment.type === 'image') {
      // Endpoint: /generate-from-image
      const formData = new FormData();
      formData.append('image', attachment.file);
      formData.append('prompt', textMessage || 'Jelaskan dan analisis gambar ini secara detail.');

      const response = await fetch('/generate-from-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      resultText = data.output;

    } else if (attachment && attachment.type === 'doc') {
      // Endpoint: /generate-from-document
      const formData = new FormData();
      formData.append('document', attachment.file);
      formData.append('prompt', textMessage || 'Tolong ringkas dan jelaskan isi dokumen ini.');

      const response = await fetch('/generate-from-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      resultText = data.output;

    } else if (attachment && attachment.type === 'audio') {
      // Endpoint: /generate-from-audio (Sound & Voice Note)
      const formData = new FormData();
      formData.append('audio', attachment.file);
      formData.append('prompt', textMessage || 'Tolong dengarkan rekaman suara ini, buatkan transkrip ringkas dan tanggapi isinya.');

      const response = await fetch('/generate-from-audio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      resultText = data.output;

    } else {
      // Pure Text Chat -> Endpoint: /api-chat
      conversation.push({ role: 'user', text: textMessage });

      const response = await fetch('/api-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation }),
      });

      if (!response.ok) {
        conversation.pop(); // Revert user message jika gagal
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      resultText = data.output;
    }

    // Tampilkan respons AI
    updateBotMessage(loadingElement, resultText);
    totalMessages++;
    updateStats();

    // Simpan respons ke riwayat percakapan untuk konteks chat multi-turn
    conversation.push({ role: 'model', text: resultText });

  } catch (err) {
    console.error('Error saat menghubungi endpoint:', err);
    updateBotMessage(
      loadingElement,
      'Maaf, terjadi kesalahan saat menghubungi server atau memproses data. Silakan coba kembali.',
      true
    );
  } finally {
    setInputState(true);
    userInput.focus();
    scrollToBottom();
  }
}

// UI State Toggle
function setInputState(enabled) {
  userInput.disabled = !enabled;
  btnSend.disabled = !enabled;
  btnTriggerImage.disabled = !enabled;
  btnTriggerDoc.disabled = !enabled;
  btnTriggerAudio.disabled = !enabled;
  btnTriggerMic.disabled = !enabled;
}

// Scroll to bottom of chat
function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Append User Message Row
function appendUserMessage(text, attachment) {
  const row = document.createElement('div');
  row.className = 'message-row user';

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = 'U';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  // Jika ada attachment, render preview di dalam bubble
  if (attachment) {
    const attachContainer = document.createElement('div');
    attachContainer.className = 'bubble-attachment';

    if (attachment.type === 'image') {
      const img = document.createElement('img');
      img.src = attachment.previewUrl;
      img.className = 'attachment-img-preview';
      img.alt = 'Uploaded Image';
      img.addEventListener('click', () => openImageLightbox(attachment.previewUrl));
      attachContainer.appendChild(img);
    } else if (attachment.type === 'doc') {
      const docChip = document.createElement('div');
      docChip.className = 'attachment-doc-chip';
      docChip.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
        <span>${escapeHtml(attachment.name)}</span>
      `;
      attachContainer.appendChild(docChip);
    } else if (attachment.type === 'audio') {
      const audio = document.createElement('audio');
      audio.src = attachment.previewUrl;
      audio.controls = true;
      audio.className = 'attachment-audio-player';
      attachContainer.appendChild(audio);
    }

    bubble.appendChild(attachContainer);
  }

  // Teks prompt pengguna
  if (text) {
    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    bubble.appendChild(textSpan);
  }

  row.appendChild(avatar);
  row.appendChild(bubble);
  chatBox.appendChild(row);
  scrollToBottom();
}

// Append Loading Bot Message
function appendLoadingBotMessage() {
  const row = document.createElement('div');
  row.className = 'message-row bot';

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
    </svg>
  `;

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = `
    <div class="typing-dots">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>
  `;

  row.appendChild(avatar);
  row.appendChild(bubble);
  chatBox.appendChild(row);
  scrollToBottom();

  return { row, bubble };
}

// Update Bot Message with Final Text
function updateBotMessage({ row, bubble }, text, isError = false) {
  if (isError) {
    row.classList.add('error');
    bubble.textContent = text;
  } else {
    bubble.innerHTML = formatMarkdown(text);
  }
  scrollToBottom();
}

// Open Lightbox
function openImageLightbox(src) {
  modalImg.src = src;
  imageModal.classList.remove('hidden');
}

// Simple Markdown Formatter
function formatMarkdown(text) {
  if (!text) return '';
  let formatted = escapeHtml(text);

  // Code blocks: ```code```
  formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

  // Inline code: `code`
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold: **text**
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic: *text*
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Bullet points
  formatted = formatted.replace(/^(\*|-)\s+(.*)$/gm, '• $2');

  return formatted;
}

// HTML Escaper
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
