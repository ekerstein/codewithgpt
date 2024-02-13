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
openai = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

#################################################################
# Routes

@app.route('/')
def index():
    try:
        sorted_models = get_model_list()
    except Exception as e:
        print(f"Error fetching models: {e}")
        sorted_models = []
    current_model_choice = session.get('model_choice')
    current_folder_path = get_current_folder_path()
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
   
@app.route('/reset-settings', methods=['POST'])
def reset_settings():
    session.clear()
    return jsonify({'message': 'Settings reset to default'})

@app.route('/api/files')
def get_files():
    base_path = request.args.get('path')
    files_and_dirs = list_directory(base_path)
    return jsonify(files_and_dirs)

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    prompt_user = data.get('prompt_user')
    prompt_model = data.get('prompt_model')
    file_paths = data.get('files', [])
    prompt_system = """
    Your name is "Code with GPT". You're an intelligent chat bot that answers questions about programming code.
    You may be provided files with each query and asked to make changes to the code.
    Respond concisely, focusing on the code changes that need to occur. Do not summarize.
    Be sure to mention the changes that need to take place across all files sent to you.
    """

    # Combine user prompt with file contents
    if file_paths:
        file_contents_text = files_to_text(file_paths)
        final_prompt = f"{prompt_user}{file_contents_text}"
    else:
        final_prompt = prompt_user

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

@app.route('/api/file-contents', methods=['POST'])
def file_contents():
    file_paths = request.json.get('files', [])
    contents = files_to_text(file_paths)
    return jsonify({"contents": contents})

@app.route('/api/gptignore', methods=['GET', 'POST'])
def gptignore():
    base_path = session.get('folder_path', os.getcwd())
    gptignore_path = os.path.join(base_path, '.gptignore')
    if request.method == 'POST':
        contents = request.json.get('contents', '')
        with open(gptignore_path, 'w') as f:
            f.write(contents)
        return jsonify({"message": "File updated"})
    else:
        if os.path.exists(gptignore_path):
            with open(gptignore_path, 'r') as f:
                contents = f.read()
            return jsonify({"exists": True, "contents": contents})
        else:
            return jsonify({"exists": False, "contents": ""})

#################################################################
# Utils

def get_model_list():
    models = openai.models.list()
    return sorted([model for model in models.data if model.id.startswith('gpt')], key=lambda x: x.id)

def get_current_folder_path():
    return session.get('folder_path', os.getcwd())  # Default to current working directory if not set

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
        pattern = pattern.lstrip("/").rstrip("/")
        pattern_glob = f"**{pattern}**"
        if fnmatch.fnmatch(normalized_path, pattern_glob):
            return True
    return False

def list_directory(base_path):
    ignore_patterns = parse_gptignore(base_path)
    directory_contents = []
    gptignore_exists = os.path.exists(os.path.join(base_path, '.gptignore'))
    for root, dirs, files in os.walk(base_path, topdown=True):
        # Filter directories in place to prevent walking into ignored directories
        dirs[:] = [d for d in dirs if not is_ignored(os.path.join(root, d), ignore_patterns, base_path)]
        # Filter files
        filtered_files = [f for f in files if not is_ignored(os.path.join(root, f), ignore_patterns, base_path)]
        # Append filtered files (assuming directories are not being listed separately)
        for name in filtered_files:
            relative_path = os.path.relpath(os.path.join(root, name), base_path)
            directory_contents.append({'type': 'file', 'name': name, 'path': relative_path, 'ignored': False})
    return {"files": directory_contents, "gptignoreExists": gptignore_exists}

def is_text_file(file_path):
    _, ext = os.path.splitext(file_path)
    image_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.ico']
    if ext.lower() in image_extensions:
        return False
    return True

def files_to_text(file_paths):
    contents = []
    base_path = get_current_folder_path()
    for file_path in file_paths:
        full_path = os.path.join(base_path, file_path)
        if os.path.exists(full_path) and is_text_file(full_path):
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as file:
                file_content = file.read()
                printable_contents = ''.join(c for c in file_content if c in string.printable)
                formatted_content = f"\n\n---- {os.path.basename(full_path)}\n" + printable_contents
                contents.append(formatted_content)
    return "".join(contents)

if __name__ == '__main__':
    app.run(debug=True)
