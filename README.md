# Documenta

Documenta is a mobile document management application that I am currently developing.

The goal of the project is to make document handling as automatic as possible.

## Main idea

The app should allow users to scan or photograph documents with their phone.

Documenta should then:

- detect the document automatically
- crop and improve the image
- extract text using OCR
- recognize the document type
- identify important information
- sort documents automatically
- store documents securely
- make documents searchable
- recognize deadlines and appointments
- remind the user about important dates

## Planned use cases

The app should be able to manage documents such as:

- invoices
- contracts
- insurance documents
- bank documents
- school and university documents
- tax documents
- Finanzamt documents
- official letters
- applications
- confirmations
- receipts

## AI functions

The long-term goal is that Documenta does not only read documents, but also understands their content.

For example, the user should be able to ask:

- "Show me all invoices from this year."
- "Which documents do I have for the Finanzamt?"
- "Where is the letter from my insurance?"
- "What do I still need to do this month?"

The app should also be able to help write:

- emails
- applications
- complaints
- replies
- cancellations
- official letters

In the future, the app should support written and spoken communication.

## Languages

The current goal is to support 12 languages.

Earlier project ideas also included support for more languages and RTL support for Arabic.

## Current technologies

The project currently uses or has used:

- React Native
- TypeScript
- Expo
- EAS
- Node.js
- Git
- GitHub
- Replit
- Gemini API
- OCR technologies
- ML Kit
- Document AI
- OpenCV

Possible future backend technologies:

- PostgreSQL
- pgvector

## Current status

Several basic functions have already been implemented or tested, including:

- camera access
- document scanning
- OCR
- document storage
- document processing
- first document classification logic
- first AI integration attempts

The project is still in development.

## Known problems

The current version still has several technical problems.

Examples:

- document recognition is not always reliable
- OCR quality became worse after some scanner improvements
- document edge detection is not stable
- processing can take too long
- in some cases the app can take around 30+ seconds to respond
- improvements in one part can sometimes break another part
- internal logic and memory are not yet stable enough
- PDF saving and reopening have caused problems
- the scanner and document interpretation do not yet work reliably together

## Data protection / DSGVO

Data protection is one of the most important parts of the project.

The app may process sensitive personal documents such as:

- financial documents
- contracts
- bank information
- tax documents
- insurance documents
- official letters

Therefore, the final application must be designed to comply with GDPR / DSGVO requirements.

Important topics include:

- secure storage
- encryption
- minimal data transfer
- clear user consent
- deletion of personal data
- local processing where possible
- safe handling of external AI services
- protection of API keys
- transparent data processing

## Development goal

My goal is to build Documenta step by step into an intelligent personal document assistant.

The app should eventually be able to:

scan -> read -> understand -> classify -> store -> search -> remember -> remind -> communicate

## Project status

This repository represents a work in progress.

The project is not finished and still contains experimental code, bugs and incomplete features.
