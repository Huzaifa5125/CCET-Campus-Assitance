import os
import sys
from app import app

def check_environment():
    # Check if the faiss_index directory exists
    if not os.path.exists("faiss_index") or not os.path.isdir("faiss_index"):
        print("\n❌ FAISS index folder not found!")
        print("Please make sure your 'faiss_index' folder is in the same directory as this script.")
        return False

    # Check for .env file and create it if it doesn't exist
    if not os.path.exists(".env"):
        print("❌ .env file not found. Creating a template file...")
        with open(".env", "w") as env_file:
            env_file.write("GOOGLE_API_KEY=your_api_key_here")
        print("Created .env file. Please edit it with your actual Gemini API key.")
        print("Then run this script again.")
        return False
        
    return True

if __name__ == '__main__':
    print("Running environment checks...")
    if not check_environment():
        sys.exit(1)
        
    print("\n✅ Environment looks good!")
    print("Starting local server...")
    print("Open http://127.0.0.1:5000 in your browser to test the chatbot")
    app.run(debug=True)