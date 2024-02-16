# Code with GPT

Chat interface that allows you to send files from your code repository to OpenAI when asking questions.

![screenshot](https://github.com/ekerstein/codewithgpt/assets/6055508/9a54a867-470c-48e7-8464-541c33b68457)

## Getting Started

1. Install the requirements
```
pip install -r requirements.txt
```
2. Create a `.env` file in the root directory of your project with the following content:
```
OPENAI_API_KEY=your_openai_api_key_here
```
3. The application supports a `.gptignore` file that helps in excluding files or directories from being processed by the GPT model. This is similar in concept to `.gitignore`. Review the `.gptignore` file to make sure it's excluding files you don't want to be shown on the file viewer.

4. Start the Flask application
```
python application.py
```

## How The App Works

1. **Initialization**: Upon launching, the app loads the environment variables, initializes the OpenAI SDK with your API key, and starts the Flask server.
2. **Index Page**: The main page (`/`) lists the available GPT models fetched from OpenAI, and allows the user to select a model to work with. The model selection is stored in a user session.
3. **File Viewer**: The folder in which to search for files is configurable and defaults to the current working directory. Users can view the files in the specified directory and select specific files to include in their prompt to the GPT model. The `.gptignore` file in the directory helps filter out unwanted files or directories.
4. **Chat Interface**: Users can type in prompts or questions, which, along with the selected files' contents, are sent to the GPT model. The response from the model is then displayed on the web page.

## Contributing

Contributions are welcome! Here are a few things that need attention:

* **Tests**: Adding unit and integration tests
* **Request Customization**: Add more customization options for the requests sent to OpenAI, such as choosing request parameters.
* **Response Formatting**: Make the API response more user-friendly. Code formatting is not happening in the response window.

To contribute, please fork the repository, make your changes, and submit a pull request with a clear description of what you've done.
