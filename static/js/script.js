////////////////////////////////////////////////////////////////////
// Functions

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

    updateChatResponseContainer(userMessage);
    feather.replace(); // Update icons to render the "user" icon

    let selectedModel = document.getElementById('model-selector').value; // Get the selected model

    // Insert spinner right after message is sent
    let spinner = document.createElement('div');
    spinner.className = "spinner-icon"; // Use this class for your spinner
    updateChatResponseContainer(spinner);

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
    
        updateChatResponseContainer(responseMessage);
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
            updateChatResponseContainer(errorMessage);
            feather.replace(); // Update icons to render the "alert-circle" icon
        }).catch(jsonError => {
            console.error('Error:', jsonError);
            let errorMessage = document.createElement('div');
            errorMessage.innerHTML = `
                <div style="color: red;">
                    <i data-feather="alert-circle"></i>
                    Error: An unexpected error occurred and could not parse error details.
                </div>`;
            updateChatResponseContainer(errorMessage);
            feather.replace(); // Ensure icons are updated even in this catch block
        });
    });
}

function updateChatResponseContainer(element) {
    let chatResponseContainer = document.getElementById('chat-response');
    chatResponseContainer.appendChild(element);
    setTimeout(() => {
        chatResponseContainer.scrollTop = chatResponseContainer.scrollHeight;
    }, 0);
}

function openGptIgnoreModal(edit = false) {
    fetch('/api/gptignore')
        .then(response => response.json())
        .then(data => {
            if (edit || !data.exists) {
                document.getElementById('gptignoreContents').value = data.exists ? data.contents : ".git/\n__pycache__/\nvenv/\n.env\n.gptignore";
                var gptignoreModal = new bootstrap.Modal(document.getElementById('gptignoreModal'), {
                    // options
                });
                gptignoreModal.show();
            }
        })
        .catch(error => console.log('Error fetching .gptignore:', error));
}

function saveGptIgnore() {
    const contents = document.getElementById('gptignoreContents').value;
    fetch('/api/gptignore', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: contents,
        }),
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.message);
        var gptignoreModal = bootstrap.Modal.getInstance(document.getElementById('gptignoreModal'));
        gptignoreModal.hide();
        fetchFiles();
    })
    .catch(error => console.log('Error saving .gptignore:', error));
}

function fetchFiles() {
    const basePath = document.getElementById('folder-selector').value;
    fetch(`/api/files?path=${encodeURIComponent(basePath)}`)
        .then(response => response.json())
        .then(data => {
            console.log(data)
            const fileSystemContainer = document.getElementById('file-system');
            fileSystemContainer.innerHTML = '';

            document.getElementById('edit-gptignore').disabled = true;

            if (data.files.length === 0) {
                // No files in directory
                const messageElement = document.createElement('div');
                messageElement.textContent = 'No files in folder';
                fileSystemContainer.appendChild(messageElement);
            } else if (!data.gptignoreExists) {
                // .gptignore doesn't exist
                const buttonElement = document.createElement('button');
                buttonElement.textContent = 'Create .gptignore file to view folder';
                buttonElement.className = 'btn btn-success w-100';
                buttonElement.onclick = function() { openGptIgnoreModal(); };
                fileSystemContainer.appendChild(buttonElement);
            } else {
                // Files exist and .gptignore exists
                document.getElementById('edit-gptignore').disabled = false;

                data.files.forEach(item => {
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
                        updateCopyButtonState();
                    });
                });
            }
        })
        .catch(error => console.error('Failed to fetch files:', error));
}

function resetSettings() {
    fetch('/reset-settings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to clear settings');
        }
        return response.json();
    })
    .then(data => {
        console.log(data.message);
        window.location.reload();
    })
    .catch(error => {
        console.error('Error clearing settings:', error);
    });
}

function copyFileContentsAsPrompt() {
    let selectedFiles = [];
    document.querySelectorAll('input[name="files"]:checked').forEach(checkbox => {
        selectedFiles.push(checkbox.value);
    });
    
    fetch('/api/file-contents', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            files: selectedFiles,
        }),
    })
    .then(response => response.json())
    .then(data => {
        navigator.clipboard.writeText(data.contents).then(() => {
            console.log("Files contents copied to clipboard")
        }, (err) => {
            console.error('Could not copy text: ', err);
        });
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function unselectAllFiles() {
    document.querySelectorAll('input[name="files"]:checked').forEach(checkbox => {
        checkbox.checked = false;
    });
    updateCopyButtonState();
}

function selectAllFiles() {
    document.querySelectorAll('input[name="files"]').forEach(checkbox => {
        checkbox.checked = true;
    });
    updateCopyButtonState();
}

function updateCopyButtonState() {
    const anyFilesSelected = document.querySelectorAll('input[name="files"]:checked').length > 0;
    document.getElementById('copy-file-contents').disabled = !anyFilesSelected;
}

////////////////////////////////////////////////////////////////////
// Event Listeners

document.addEventListener('DOMContentLoaded', function() {
    fetchFiles(); // Automatically fetch files after fetching the current folder path
    updateCopyButtonState();
    feather.replace(); // Initialize Feather icons
});

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

document.getElementById('folder-selector-btn').addEventListener('click', function() {
    let folderPath = document.getElementById('folder-selector').value.trim();
    // Update the session with the new folder path
    fetch('/set-folder', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({folder_path: folderPath}),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to update folder path');
        }
        return response.json();
    })
    .then(data => {
        console.log('Folder path updated:', data.folder_path);
    })
    .catch(error => {
        console.error('Error updating folder path:', error);
    });
});

document.getElementById('user-input').addEventListener('keydown', function(event) {
    // Check if 'Ctrl' or 'Command' (for macOS) and 'Enter' keys are pressed together
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        sendChat(); // Call the function to send the chat
        event.preventDefault(); // Prevent default behavior to avoid newline in textarea
    }
});

document.getElementById('user-input').addEventListener('input', function() {
    // Enable the send button only if there's text in the input box
    document.getElementById('send-button').disabled = !this.value.trim();
});
