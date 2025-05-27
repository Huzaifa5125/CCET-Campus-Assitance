import os
from flask import Flask, request, jsonify, render_template
import google.generativeai as genai
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain.vectorstores import FAISS
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory
from dotenv import load_dotenv
import logging
import re
from custom_prompt import get_custom_prompt

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Initialize the environment
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY or GOOGLE_API_KEY == "your_api_key_here":
    logger.error("No valid GOOGLE_API_KEY found in environment variables")
    print("⚠️ Please set your Gemini API key in the .env file")
else:
    genai.configure(api_key=GOOGLE_API_KEY)
    logger.info("API key configured successfully")

# Global variables for the chain and memory
qa_chain = None
memory = None

def initialize_chatbot():
    global qa_chain, memory
    
    logger.info("Initializing chatbot...")
    
    # Initialize embeddings
    try:
        embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
        logger.info("Embeddings initialized")
    except Exception as e:
        logger.error(f"Error initializing embeddings: {str(e)}")
        return False
    
    # Load the vector store
    try:
        vector_store = FAISS.load_local("faiss_index", embeddings,allow_dangerous_deserialization=True)
        logger.info("Vector store loaded successfully!")
    except Exception as e:
        logger.error(f"Error loading vector store: {str(e)}")
        print(f"⚠️ Error loading vector store: {str(e)}")
        print("Make sure your 'faiss_index' folder is in the same directory as this script.")
        return False
    
    # Create memory
    memory = ConversationBufferMemory(
        memory_key="chat_history",
        return_messages=True,
        output_key="answer"
    )
    logger.info("Conversation memory initialized")
    
    # Initialize the language model
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            temperature=0.2,
            top_p=0.85,
            google_api_key=GOOGLE_API_KEY
        )
        logger.info("Language model initialized")
    except Exception as e:
        logger.error(f"Error initializing language model: {str(e)}")
        return False
    
    # Create the conversation chain with the custom prompt
    try:
        retriever = vector_store.as_retriever(search_kwargs={"k": 3})
        
        qa_chain = ConversationalRetrievalChain.from_llm(
            llm=llm,
            retriever=retriever,
            memory=memory,
            verbose=True,
            return_source_documents=False,  # Set to False to hide source documents
            combine_docs_chain_kwargs={"prompt": get_custom_prompt()},
            
        )
        logger.info("QA chain created successfully")
    except Exception as e:
        logger.error(f"Error creating QA chain: {str(e)}")
        return False
    
    return True

# Function to format links as HTML anchor tags
def format_links_as_html(text):
    # Detect markdown style links [text](url)
    markdown_pattern = r'\[(.*?)\]\((https?://[^\s\)]+)\)'
    if re.search(markdown_pattern, text):
        text = re.sub(markdown_pattern, r'<a href="\2" target="_blank">\1</a>', text)
        return text
    
    # Handle URLs in square brackets [url]
    bracket_pattern = r'\[(https?://[^\s\]]+)\]'
    if re.search(bracket_pattern, text):
        text = re.sub(bracket_pattern, r'<a href="\1" target="_blank">\1</a>', text)
        return text
    
    # Regular URL pattern
    url_pattern = r'(https?://[^\s\]]+)'
    
    # Find all URLs in the text
    urls = re.findall(url_pattern, text)
    
    # If there are multiple URLs, keep only the first one
    if len(urls) > 1:
        for url in urls[1:]:
            text = text.replace(url, "")
    
    # Replace the remaining URL with an HTML anchor tag
    if urls:
        text = re.sub(url_pattern, r'<a href="\1" target="_blank">\1</a>', text, count=1)
    
    return text

# Function to properly escape asterisks for markdown rendering
def escape_markdown(text):
    # Replace single asterisks not intended for markdown with escaped versions
    # This regex looks for asterisks that aren't part of markdown patterns
    return re.sub(r'(?<!\*)\*(?!\*)', r'\*', text)

# Function to format markdown and handle asterisks with proper line breaks
def format_markdown_with_breaks(text):
    # First remove escaped asterisks (\*) and replace with just asterisks (*)
    text = text.replace('\\*', '*')
    
    # Handle bold text (convert **text** to <strong>text</strong>)
    text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)
    
    # Now split text by lines for processing asterisk line breaks
    lines = text.split('\n')
    formatted_lines = []
    
    for i, line in enumerate(lines):
        # If line starts with asterisk (possibly after whitespace), add a line break before it
        # except for the first line
        if line.strip().startswith('*'):
            # Extract content after the asterisk
            content = line.strip()[1:].strip()
            
            # Add line break (except for the first line)
            if i == 0 or len(formatted_lines) == 0:
                formatted_lines.append(f"• {content}")
            else:
                formatted_lines.append(f"<br>• {content}")
        else:
            formatted_lines.append(line)
    
    return '\n'.join(formatted_lines)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    global qa_chain
    
    # Initialize on first request if not already done
    if qa_chain is None:
        success = initialize_chatbot()
        if not success:
            return jsonify({"error": "Failed to initialize chatbot. Check server logs for details."}), 500
    
    data = request.json
    user_message = data.get('message', '')
    
    if not user_message:
        return jsonify({"error": "No message provided"}), 400
    
    try:
        logger.info(f"Processing user query: {user_message}")
        
        # Process the query through the QA chain
        result = qa_chain({"question": user_message})
        
        # Extract the answer
        answer = result.get("answer", "I'm sorry, I couldn't generate a response.")
        
        # Format the answer (escape markdown, format links, and handle numbered lists)
        answer = escape_markdown(answer)
        answer = format_links_as_html(answer)
        answer = format_markdown_with_breaks(answer)
        
        logger.info("Query processed successfully")
        
        return jsonify({
            "answer": answer,
            # No sources included in the response
        })
    
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return jsonify({"error": f"Error processing request: {str(e)}"}), 500