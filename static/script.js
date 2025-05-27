document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const sourcesContainer = document.getElementById('sourcesContainer');
    const sourcesList = document.getElementById('sourcesList');
    
    // Handle enter key press
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Handle send button click
    sendButton.addEventListener('click', sendMessage);
    
    function sendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;
        
        // Add user message to chat
        addMessage(message, 'user');
        userInput.value = '';
        
        // Show thinking indicator
        const thinkingId = addThinking();
        
        // Send message to backend
        fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        })
        .then(response => response.json())
        .then(data => {
            // Remove thinking indicator
            removeThinking(thinkingId);
            
            if (data.error) {
                addMessage('Sorry, I encountered an error: ' + data.error, 'bot');
                return;
            }
            
            // Add bot response (using innerHTML to render HTML tags)
            addMessageWithHTML(data.answer, 'bot');
            
            // Hide sources container (since we're not using it anymore)
            sourcesContainer.style.display = 'none';
        })
        .catch(error => {
            removeThinking(thinkingId);
            addMessage('Sorry, I couldn\'t connect to the server. Please try again later.', 'bot');
            console.error('Error:', error);
        });
    }
    
    function addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // New function to add message with HTML content (for hyperlinks)
    function addMessageWithHTML(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = content; // Use innerHTML to render HTML tags
        
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function addThinking() {
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'message bot-message thinking-message';
        const id = 'thinking-' + Date.now();
        thinkingDiv.id = id;
        
        const thinkingIndicator = document.createElement('div');
        thinkingIndicator.className = 'thinking';
        thinkingIndicator.innerHTML = '<span></span><span></span><span></span>';
        
        thinkingDiv.appendChild(thinkingIndicator);
        chatMessages.appendChild(thinkingDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return id;
    }
    
    function removeThinking(id) {
        const thinkingDiv = document.getElementById(id);
        if (thinkingDiv) {
            thinkingDiv.remove();
        }
    }
});