# Code with GPT

Chat interface that allows you to send your code repository to OpenAI when asking questions.

![screenshot](https://github.com/ekerstein/codewithgpt/assets/6055508/9a54a867-470c-48e7-8464-541c33b68457)

## Getting Started

### Prerequisites

To run this Flask application, be sure to install the requirements

```
pip install -r requirements.txt
```

### Setting Up Your `.env` File

Before starting the application, you need to configure your environment variables. Create a `.env` file in the root directory of your project with the following content:

```
OPENAI_API_KEY=your_openai_api_key_here
```

Replace `your_openai_api_key_here` with your actual OpenAI API key.

### Configuring `.gptignore`

The application supports a `.gptignore` file that helps in excluding files or directories from being processed by the GPT model. This is similar in concept to `.gitignore`.

Review the `.gptignore` file to make sure it's excluding files you don't want to be shown on the file viewer.

### Starting the Flask App

To start the Flask application, navigate to your project directory in the terminal and run:

```
python application.py
```

This command will start the development server, and you should be able to access the application by navigating to `http://localhost:5000/` in your web browser.

## How The App Works

### General Workflow

1. **Initialization**: Upon launching, the app loads the environment variables, initializes the OpenAI SDK with your API key, and starts the Flask server.
2. **Index Page**: The main page (`/`) lists the available GPT models fetched from OpenAI, and allows the user to select a model to work with. The model selection is stored in a user session.
3. **File Viewer**: The folder in which to search for files is configurable and defaults to the current working directory. Users can view the files in the specified directory and select specific files to include in their prompt to the GPT model. The `.gptignore` file in the directory helps filter out unwanted files or directories.
4. **Chat Interface**: Users can type in prompts or questions, which, along with the selected files' contents, are sent to the GPT model. The response from the model is then displayed on the web page.

## Contributing

Contributions are welcome! Here are a few things that need attention:

- **Tests**: Adding or improving unit and integration tests to ensure reliability and predictability of the app.
- **API Response Formatting**: Make the API response more user-friendly and standardized to improve client-side handling. Code formatting is not happening at the moment in the response.
- **Request Customization**: Implement more customization options for the requests sent to OpenAI, such as choosing different types of request parameters.
- **Code Cleanup and Optimization**: Look for opportunities to refactor and optimize the existing codebase for better performance and readability.

To contribute, please fork the repository, make your changes, and submit a pull request with a clear description of what you've done.
