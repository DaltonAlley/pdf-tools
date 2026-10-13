## PDF APP
A comprehensive suite of PDF tools for UPS stores.

## Working Rules

- When the agent is done making changes to the PDF app, serve it to the user on an available port for a live test. If another pdf-tools dev server is already up just make sure it is serving the most up to date pdf-tools.
- When making changes to PDF app, don't use Playwright Python to verify your changes. Instead opt to use Agent Browser to check your work, verify the changes have been done the way the user intended.
- Python playwright should be used to ensure core workflows are well tested and always functional. Core workflows for PDF tools include combine PDFs, PDF to images, Images to PDF, impose artwork.
