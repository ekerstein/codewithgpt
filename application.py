from flask import Flask, session, render_template, request, jsonify
from dotenv import load_dotenv
from openai import OpenAI, RateLimitError, OpenAIError
import os
import fnmatch
import string

# Initialize Flask app
app = Flask(__name__, static_url_path='/static', static_folder='static')
app.secret_key = 'this_app_should_only_be_run_locally'

# Load environment variables
load_dotenv()

# Setup OpenAI
openai = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"),)

@app.route('/')
def index():
    try:
        models = openai.models.list()
        sorted_models = sorted([model for model in models.data if model.id.startswith('gpt')], key=lambda x: x.id)
    except Exception as e:
        print(f"Error fetching models: {e}")
        sorted_models = []
    current_model_choice = session.get('model_choice')
    current_folder_path = session.get('folder_path', os.getcwd())  # Default to current working directory if not set
    return render_template(
        'index.html', 
        models=sorted_models, 
        current_model_choice=current_model_choice, 
        current_folder_path=current_folder_path
    )

@app.route('/set-model', methods=['POST'])
def set_model():
    model = request.json.get('model')  # Assuming the model choice is sent as JSON data
    session['model_choice'] = model  # Store model choice in session
    return jsonify({'message': 'Model choice saved', 'model': model})

@app.route('/set-folder', methods=['POST'])
def set_folder():
    folder_path = request.json.get('folder_path')  # Assuming folder path is sent as JSON data
    session['folder_path'] = folder_path  # Store folder path in session
    return jsonify({'message': 'Folder path saved', 'folder_path': folder_path})

def parse_gptignore(base_path):
    ignore_patterns = []
    gptignore_path = os.path.join(base_path, '.gptignore')
    if os.path.exists(gptignore_path):
        with open(gptignore_path, 'r') as file:
            ignore_patterns = [line.strip() for line in file if line.strip()]
    return ignore_patterns

def is_ignored(path, ignore_patterns, base_path):
    normalized_path = os.path.normpath(path)
    for pattern in ignore_patterns:
        pattern = pattern.replace("/", "")
        pattern_glob = f"**{pattern}**"
        if fnmatch.fnmatch(normalized_path, pattern_glob):
            return True

    return False

def list_directory(base_path):
    ignore_patterns = parse_gptignore(base_path)
    directory_contents = []
    for root, dirs, files in os.walk(base_path, topdown=True):
        # Filter directories in place to prevent walking into ignored directories
        dirs[:] = [d for d in dirs if not is_ignored(os.path.join(root, d), ignore_patterns, base_path)]
        
        # Filter files
        filtered_files = [f for f in files if not is_ignored(os.path.join(root, f), ignore_patterns, base_path)]
        
        # Append filtered files (assuming directories are not being listed separately)
        for name in filtered_files:
            relative_path = os.path.relpath(os.path.join(root, name), base_path)
            directory_contents.append({'type': 'file', 'name': name, 'path': relative_path, 'ignored': False})
    
    return directory_contents

@app.route('/api/files')
def get_files():
    base_path = request.args.get('path')
    files_and_dirs = list_directory(base_path)
    return jsonify(files_and_dirs)

# Utility function to check if a file is a text file
def is_text_file(file_path):
    _, ext = os.path.splitext(file_path)
    image_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.ico']
    if ext.lower() in image_extensions:
        return False
    return True

def files_to_text(file_paths):
    contents = []
    for path in file_paths:
        if os.path.exists(path) and is_text_file(path):
            with open(path, 'r', encoding='utf-8', errors='ignore') as file:
                file_content = file.read()
                printable_contents = ''.join(c for c in file_content if c in string.printable)
                formatted_content = f"\n\n---- {os.path.basename(path)}\n" + printable_contents
                contents.append(formatted_content)

    return "".join(contents)

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    prompt_user = data.get('prompt_user')
    prompt_model = data.get('prompt_model')
    file_paths = data.get('files', [])
    prompt_system = """
        You are Software Engineer GPT, an AI software engineer.
        You will be provided with a code repository and asked questions about making changes to the code.
    """

    # Combine user prompt with file contents
    if file_paths:
        file_contents_text = files_to_text(file_paths)
        final_prompt = f"{prompt_user}{file_contents_text}"
    else:
        final_prompt = prompt_user

    print("------------PROMPT START------------")
    print(final_prompt)
    print("------------PROMPT   END------------")

    # Generate response using the OpenAI API
    try:
        response = openai.chat.completions.create(
            model=prompt_model,
            messages=[
                {"role": "system", "content": prompt_system},
                {"role": "user", "content": final_prompt}
            ]
        )
        response_message = response.choices[0].message.content
    except RateLimitError as e:
        # Handle rate limit errors specifically
        return jsonify({
            "error": True,
            "message": "You have exceeded your API request quota. Please try again later.",
            "details": "Rate limit exceeded"
        }), 429
    except OpenAIError as e:
        return jsonify({
            "error": True,
            "message": "An error occurred with the OpenAI API.",
            "details": str(e)
        }), 500
    except Exception as e:
        return jsonify({
            "error": True,
            "message": "An unexpected error occurred.",
            "details": str(e)
        }), 500

    return jsonify({"response": response_message})

if __name__ == '__main__':
    app.run(debug=True)
