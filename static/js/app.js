// CCET Chatbot Application JavaScript

class CCETChatbot {
    constructor() {
        this.chatContainer = document.getElementById('chat-container');
        this.chatInput = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('send-btn');
        this.sidebar = document.getElementById('sidebar');
        this.toggleSidebarBtn = document.getElementById('toggle-sidebar');
        this.closeSidebarBtn = document.getElementById('close-sidebar');
        this.clearChatBtn = document.getElementById('clear-chat');
        this.helpBtn = document.getElementById('help-btn');
        this.helpModal = document.getElementById('help-modal');
        this.syllabusSelect = document.getElementById('syllabus-select');
        this.downloadSyllabusBtn = document.getElementById('download-syllabus');
        
        this.conversationHistory = [];
        this.isTyping = false;
        
        // Syllabus URLs
        this.syllabusUrls = {
            'cse': 'https://ccet.ac.in/pdf/CSE_syllabus_2025.pdf',
            'mechanical': 'https://ccet.ac.in/pdf/Mech_syll2024-28.pdf',
            'ece': 'https://ccet.ac.in/pdf/ECE_SYLLABUS_2024-28.pdf',
            'civil': 'https://ccet.ac.in/pdf/Civil_syllabus2024-28.pdf'
        };
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.showWelcomeMessage();
    }
    
    bindEvents() {
        // Chat input events
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Sidebar events
        this.toggleSidebarBtn?.addEventListener('click', () => this.toggleSidebar());
        this.closeSidebarBtn?.addEventListener('click', () => this.closeSidebar());
        
        // Quick query buttons
        const queryButtons = document.querySelectorAll('.query-btn');
        queryButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const query = btn.getAttribute('data-query');
                this.chatInput.value = query;
                this.sendMessage();
            });
        });
        
        // Syllabus download
        this.syllabusSelect.addEventListener('change', () => {
            this.downloadSyllabusBtn.disabled = !this.syllabusSelect.value;
        });
        
        this.downloadSyllabusBtn.addEventListener('click', () => this.downloadSyllabus());
        
        // Clear chat
        this.clearChatBtn.addEventListener('click', () => this.clearChat());
        
        // Help modal
        this.helpBtn.addEventListener('click', () => {
            this.helpModal.classList.add('show');
        });
        
        // Modal close events
        const modalCloseButtons = document.querySelectorAll('.modal-close');
        modalCloseButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.helpModal.classList.remove('show');
            });
        });
        
        // Close modal on backdrop click
        this.helpModal.addEventListener('click', (e) => {
            if (e.target === this.helpModal) {
                this.helpModal.classList.remove('show');
            }
        });
        
        // Close sidebar on outside click (mobile)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && 
                this.sidebar.classList.contains('show') && 
                !this.sidebar.contains(e.target) && 
                !this.toggleSidebarBtn.contains(e.target)) {
                this.closeSidebar();
            }
        });
    }
    
    showWelcomeMessage() {
        const welcomeHtml = `
            <div class="welcome-message">
                <h3>Welcome to CCET Chatbot Assistant! 🎓</h3>
                <p>I'm here to help you with information about Chandigarh College of Engineering and Technology.</p>
                <p><strong>I can help you with:</strong></p>
                <ul>
                    <li>Admission process and requirements</li>
                    <li>Fee structure and payment details</li>
                    <li>Placement information and statistics</li>
                    <li>Hostel facilities and accommodation</li>
                    <li>Academic calendar and schedules</li>
                    <li>Contact information and general queries</li>
                </ul>
                <p>Use the sidebar for quick access to portals and syllabus downloads, or start typing your question below!</p>
                <div class="status-online">Bot is online</div>
            </div>
        `;
        this.chatContainer.innerHTML = welcomeHtml;
    }
    
    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message || this.isTyping) return;
        
        this.addMessage(message, 'user');
        this.chatInput.value = '';
        this.conversationHistory.push({ role: 'user', content: message });
        
        this.showTypingIndicator();
        
        try {
            // Send message to Flask backend
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });
            
            const data = await response.json();
            
            this.hideTypingIndicator();
            
            if (response.ok) {
                this.addMessage(data.answer, 'bot');
                this.conversationHistory.push({ role: 'bot', content: data.answer });
            } else {
                this.addMessage('Sorry, I encountered an error. Please try again.', 'bot');
                console.error('Error:', data.error);
            }
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('Sorry, I\'m having trouble connecting. Please check your connection and try again.', 'bot');
            console.error('Network error:', error);
        }
    }
    
    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-bubble">
                <div class="message-content">${content}</div>
                <div class="message-time">${timestamp}</div>
                ${sender === 'bot' ? `
                    <div class="message-actions">
                        <button class="copy-btn" onclick="app.copyMessage(this)" title="Copy message">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
        
        this.chatContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    showTypingIndicator() {
        this.isTyping = true;
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="typing-bubble">
                <span>CCET Bot is typing</span>
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        this.chatContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }
    
    copyMessage(button) {
        const messageContent = button.closest('.message-bubble').querySelector('.message-content').textContent;
        navigator.clipboard.writeText(messageContent).then(() => {
            const originalIcon = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                button.innerHTML = originalIcon;
            }, 1000);
        });
    }
    
    toggleSidebar() {
        this.sidebar.classList.add('show');
    }
    
    closeSidebar() {
        this.sidebar.classList.remove('show');
    }
    
    downloadSyllabus() {
        const selectedBranch = this.syllabusSelect.value;
        if (!selectedBranch) return;
        
        const url = this.syllabusUrls[selectedBranch];
        const branchNames = {
            'cse': 'Computer Science Engineering',
            'mechanical': 'Mechanical Engineering',
            'ece': 'Electronics & Communication Engineering',
            'civil': 'Civil Engineering'
        };
        
        // Create a temporary link and click it to download
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.download = `${branchNames[selectedBranch]}_Syllabus.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show success message
        this.addMessage(`✅ Downloading ${branchNames[selectedBranch]} syllabus. The file will open in a new tab.`, 'bot');
        
        // Reset the select
        this.syllabusSelect.value = '';
        this.downloadSyllabusBtn.disabled = true;
    }
    
    clearChat() {
        if (confirm('Are you sure you want to clear the chat history?')) {
            this.conversationHistory = [];
            this.showWelcomeMessage();
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CCETChatbot();
});

// Handle responsive behavior
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        document.getElementById('sidebar').classList.remove('show');
    }
});

// Prevent default form submission if any forms are added later
document.addEventListener('submit', (e) => {
    e.preventDefault();
});

// Add notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-base);
        padding: var(--space-12) var(--space-16);
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(notificationStyles);