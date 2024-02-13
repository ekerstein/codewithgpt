function sendChat() {
    let userInput = document.getElementById('user-input').value.trim();
    if (!userInput) {
        // If userInput is empty or only contains whitespace, don't proceed
        return;
    }
    document.getElementById('user-input').value = '';
    document.getElementById('send-button').disabled = true;

    // Gather selected files
    let selectedFiles = [];
    document.querySelectorAll('input[name="files"]:checked').forEach(checkbox => {
        selectedFiles.push(checkbox.value);
    });

    let chatResponseContainer = document.getElementById('chat-response');

    // Display the user's message with a user icon
    let userMessage = document.createElement('div');
    userMessage.style.color = "blue";
    // Create an icon element
    let icon = document.createElement('i');
    icon.setAttribute('data-feather', 'user');
    userMessage.appendChild(icon);
    // Response
    let preElement = document.createElement('pre');
    let codeElement = document.createElement('code');
    codeElement.textContent = userInput;
    preElement.appendChild(codeElement);
    userMessage.appendChild(preElement);

    chatResponseContainer.appendChild(userMessage);
    feather.replace(); // Update icons to render the "user" icon

    let selectedModel = document.getElementById('model-selector').value; // Get the selected model

    // Insert spinner right after message is sent
    let spinner = document.createElement('div');
    spinner.className = "spinner-icon"; // Use this class for your spinner
    chatResponseContainer.appendChild(spinner);

    fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt_user: userInput,
            prompt_model: selectedModel,
            files: selectedFiles // Include selected files in the request
        }),
    })
    .then(response => {
        if (!response.ok) {
            throw response;
        }
        return response.json();
    })
    .then(data => {
        spinner.style.display = 'none';
        console.log(data.response);
        if (data.error) {
            throw data;
        }
        // Outer div
        let responseMessage = document.createElement('div');
        responseMessage.style.color = "black";
        // Create an icon element
        let icon = document.createElement('i');
        icon.setAttribute('data-feather', 'server');
        responseMessage.appendChild(icon);
        // Response
        let preElement = document.createElement('pre');
        let codeElement = document.createElement('code');
        codeElement.textContent = data.response;
        preElement.appendChild(codeElement);
        responseMessage.appendChild(preElement);
    
        chatResponseContainer.appendChild(responseMessage);
        feather.replace();
    })
    .catch(error => {
        spinner.style.display = 'none'; // Hide spinner on error as well
        error.json().then(err => {
            console.error('Error:', err);
            let errorMessage = document.createElement('div');
            errorMessage.innerHTML = `
                <div style="color: red;">
                    <i data-feather="alert-circle"></i>
                    Error: ${err.message || "An unexpected error occurred."}
                </div>`;
            chatResponseContainer.appendChild(errorMessage);
            feather.replace(); // Update icons to render the "alert-circle" icon
        }).catch(jsonError => {
            console.error('Error:', jsonError);
            let errorMessage = document.createElement('div');
            errorMessage.innerHTML = `
                <div style="color: red;">
                    <i data-feather="alert-circle"></i>
                    Error: An unexpected error occurred and could not parse error details.
                </div>`;
            chatResponseContainer.appendChild(errorMessage);
            feather.replace(); // Ensure icons are updated even in this catch block
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    fetchCurrentFolderPath().then(() => {
        fetchFiles(); // Automatically fetch files after fetching the current folder path
    });
    
    const input = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    input.addEventListener('input', function() {
        // Enable the send button only if there's text in the input box
        sendButton.disabled = !this.value.trim();
    });

    feather.replace(); // Initialize Feather icons
});

function fetchCurrentFolderPath() {
    return fetch('/api/current-folder') // Add `return` here
        .then(response => response.json())
        .then(data => {
            const folderPathInput = document.getElementById('folder-path');
            folderPathInput.value = data.current_folder;
            // Optionally, you can call fetchFiles() here if you prefer to chain it as a promise after setting folder path
        })
        .catch(error => console.error('Error fetching current folder:', error));
}

function fetchFiles() {
    // Assuming 'base_path' is known or selected by the user
    const basePath = document.getElementById('folder-path').value; // or any other logic to get/set this
    fetch(`/api/files?path=${encodeURIComponent(basePath)}`)
        .then(response => response.json())
        .then(data => {
            const fileSystemContainer = document.getElementById('file-system');
            fileSystemContainer.innerHTML = ''; // Clear previous contents

            data.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = "file-item"; 
                const checkBox = `<input type="checkbox" class="file-checkbox" name="files" value="${item.path}"> `;
                const fileName = `<span class="file-name">${item.path}</span>`; // Wrap file name in a span for style or event handling
                itemElement.innerHTML = checkBox + fileName; // Combine checkbox and filename
                fileSystemContainer.appendChild(itemElement);
            });

            document.querySelectorAll('.file-item').forEach(item => {
                item.addEventListener('click', function(event) {
                    // Prevent toggling if the click is directly on the checkbox
                    if (event.target.type !== 'checkbox') {
                        const checkBox = this.querySelector('.file-checkbox');
                        checkBox.checked = !checkBox.checked;
                    }
                });
            });
        })
        .catch(error => console.error('Failed to fetch files:', error));
}

function unselectAllFiles() {
    document.querySelectorAll('input[name="files"]:checked').forEach(checkbox => {
        checkbox.checked = false;
    });
}

function selectAllFiles() {
    document.querySelectorAll('input[name="files"]').forEach(checkbox => {
        checkbox.checked = true;
    });
}

document.getElementById('model-selector').addEventListener('change', function() {
    let selectedModel = this.value;
    // Optionally, update the session with the new model choice
    fetch('/set-model', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({model: selectedModel}),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to update model choice');
        }
        return response.json();
    })
    .then(data => {
        console.log('Model choice updated:', data.model);
    })
    .catch(error => {
        console.error('Error updating model choice:', error);
    });
});

document.getElementById('user-input').addEventListener('keydown', function(event) {
    // Check if 'Ctrl' or 'Command' (for macOS) and 'Enter' keys are pressed together
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        sendChat(); // Call the function to send the chat
        event.preventDefault(); // Prevent default behavior to avoid newline in textarea
    }
});