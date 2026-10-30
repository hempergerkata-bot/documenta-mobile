
# Documenta

Documenta is an intelligent mobile document-management assistant currently under development.

The purpose of the project is not only to scan and store documents.  
The long-term goal is to create a system that can:

**scan → read → understand → classify → store → search → remember → remind → communicate**

The application should reduce the amount of manual work required for handling private documents.

---

# 1. Main goal

People receive documents from many different sources:

- authorities
- Finanzamt
- banks
- insurance companies
- schools
- universities
- employers
- online shops
- service providers
- contracts
- invoices
- emails
- PDFs

Normally, the user must manually decide:

- what the document is
- where it belongs
- whether it contains an important deadline
- whether a payment is required
- whether an answer is necessary
- where the document should be stored
- how to find it again later

Documenta should automate as much of this process as possible.

---

# 2. Complete document workflow

## Step 1 – Document input

The user should be able to add documents in several ways.

### Camera / Scanner

The user photographs a paper document with the smartphone.

The application should:

1. detect the document on the camera image
2. recognize its edges
3. crop the background automatically
4. correct the perspective
5. improve contrast and readability
6. prepare the image for OCR

The user should not have to manually crop every document.

### PDF import

The application should later support importing existing PDF documents.

### Email import

A later version should be able to recognize documents and attachments received by email.

For example:

- invoices
- confirmations
- contracts
- school documents
- official correspondence

---

# 3. OCR – Optical Character Recognition

OCR converts the photographed or scanned document into machine-readable text.

The OCR component should recognize:

- printed text
- numbers
- dates
- addresses
- invoice numbers
- amounts
- IBANs
- reference numbers
- names
- email addresses

The OCR result is the basis for all further processing.

The application should preserve both:

1. the original document
2. the extracted machine-readable text

---

# 4. Document understanding

Reading text alone is not enough.

Documenta should understand what the document actually means.

For example, the system should recognize whether a document is:

- an invoice
- a contract
- an insurance document
- a tax document
- a letter from an authority
- a school document
- a university document
- a bank document
- a confirmation
- a receipt
- an application
- a reminder
- a termination notice
- an appointment letter

The AI should also extract the important information depending on the document type.

---

# 5. Information extraction

## Example: Invoice

Documenta should recognize:

- company / sender
- invoice number
- invoice date
- amount
- VAT
- payment deadline
- IBAN
- purpose of payment

## Example: Official letter

The app should recognize:

- authority
- recipient
- reference number
- date
- subject
- requested action
- response deadline

## Example: Contract

The app should recognize:

- contractual partners
- contract number
- start date
- end date
- monthly or yearly cost
- cancellation period
- important conditions

---

# 6. Automatic classification

After the document has been analyzed, Documenta should automatically assign it to the correct category.

Possible main categories include:

- Finanzamt
- Taxes
- School
- University
- Weiterbildung
- Insurance
- Bank
- Employment
- Authorities
- Contracts
- Invoices
- Receipts
- Health documents
- Household
- Vehicles
- Purchases

Subcategories should also be possible.

Example:

`University → Tuition → Invoice`

or:

`Taxes → Education expenses → Software`

The user should not have to manually create a folder for every document.

---

# 7. Intelligent search

One of the most important goals is that the user should not need to remember where a document was stored.

Instead, the user should be able to search using normal language.

Examples:

> Show me all invoices for my university.

> Find the letter from my insurance company.

> Which documents do I have for the Finanzamt?

> Show me all invoices from 2026.

> How much did I spend on education this year?

The system should search not only filenames but also:

- OCR text
- metadata
- categories
- dates
- companies
- amounts
- semantic meaning

---

# 8. Document memory

Documenta should build a structured memory of the user's documents.

The application should know relationships between documents.

For example:

A university-related folder may contain:

- enrollment confirmation
- tuition invoices
- software invoices
- books
- correspondence
- contracts
- certificates

The application should understand that these documents belong to the same topic.

The user should later be able to ask questions without remembering exact filenames.

---

# 9. Deadlines and reminders

Documenta should automatically recognize dates that require an action.

Examples:

- payment deadlines
- cancellation periods
- appointments
- application deadlines
- response deadlines
- contract renewal dates

The system should distinguish between:

- ordinary dates
- important dates
- deadlines requiring user action

If a document says that something must be submitted by a certain date, the app should create a reminder.

The user should receive notifications before the deadline.

---

# 10. Finanzamt and tax document organization

One major use case is tax preparation.

Documenta should be able to recognize documents that may be relevant for tax purposes.

Examples:

- education expenses
- university costs
- professional training
- software
- books
- hardware
- travel expenses
- work equipment
- invoices
- receipts

The application should group relevant documents so that the user does not have to search through hundreds of files during tax preparation.

The app itself should not make legally binding tax decisions.

It should organize and prepare documents for the user.

---

# 11. Email integration

In a future version, Documenta should connect to email accounts.

The app should be able to:

- identify relevant emails
- recognize attachments
- import documents
- classify them
- connect emails with existing documents

Example:

An invoice received by email could automatically be connected with the corresponding contract or purchase.

---

# 12. Writing assistant

Documenta should later help the user create written responses.

Based on a document, the user could request:

> Write a reply to this letter.

> Write an application.

> Write a complaint.

> Write a cancellation.

> Ask the company for more information.

The system should use information from the corresponding document to prepare the text.

The user must be able to review the message before sending it.

---

# 13. Email sending

A later version should also support sending emails.

The system should never send an important message automatically without user confirmation.

Possible workflow:

1. Documenta recognizes a document.
2. The user asks for a reply.
3. Documenta prepares the reply.
4. The user reviews it.
5. The user confirms.
6. The email is sent.

---

# 14. Written and spoken communication

Documenta should become a personal document assistant.

The user should be able to communicate with the application using text and later also speech.

Example questions:

> What do I still have to do this month?

> Which invoices are still open?

> Do I have a document from this company?

> When does this contract end?

> Find my university enrollment confirmation.

The assistant should answer based on the user's stored documents.

---

# 15. Language support

The current target is support for **12 languages**.

The system should not only translate the interface.

It should also be able to:

- recognize documents in different languages
- perform OCR in different languages
- understand document content
- classify documents
- summarize documents
- answer the user in the selected language

Earlier project planning also included an extended language scope with up to 15 languages and Arabic RTL support.

The exact final language list is still being defined.

---

# 16. Scanner module

The scanner is responsible for creating a usable digital version of a physical document.

It should perform:

- camera capture
- document edge detection
- automatic cropping
- perspective correction
- image enhancement
- preparation for OCR

Current problem:

The scanner is not yet reliable enough.

Changes that improve the scanner have sometimes caused problems in later processing stages.

---

# 17. OCR module

The OCR module is responsible for converting the document image into text.

Technologies tested or considered include:

- Google ML Kit
- Google Document AI
- other OCR approaches

Current problem:

After improving parts of the scanner, OCR recognition became less reliable in some cases.

This means the full pipeline still needs optimization.

---

# 18. AI interpretation module

The AI component should analyze the extracted text.

Its tasks include:

- identifying the document type
- extracting relevant information
- generating summaries
- detecting deadlines
- determining categories
- understanding user questions
- helping prepare replies

Gemini API has been tested as part of this functionality.

The final architecture is not yet fixed.

---

# 19. Internal memory and retrieval

A major technical requirement is that Documenta should reliably retrieve previously stored information.

The system should not behave as if every interaction starts from zero.

It should be able to find relevant stored information when the user refers to earlier documents.

A possible future architecture includes:

- PostgreSQL
- vector embeddings
- pgvector
- structured metadata
- semantic search

The goal is to combine exact database search with AI-based semantic retrieval.

---

# 20. Current technologies

## React Native

Used for building the mobile application.

The goal is to maintain a shared codebase for mobile devices.

## TypeScript

Used for application logic.

TypeScript provides static typing and helps detect programming errors during development.

## Expo

Used as the React Native development platform.

It simplifies:

- development
- testing
- mobile builds
- device integration

## EAS

Expo Application Services are used or planned for building and distributing mobile application versions.

## Node.js

Used by the JavaScript / TypeScript development environment and build tools.

## Git

Used for local version control.

Git tracks changes to the source code.

## GitHub

Used as the remote source-code repository.

It provides:

- version history
- backup
- collaboration
- project visibility

## Replit

Used during early development and experimentation.

## Gemini API

Used experimentally for AI-based document interpretation.

## ML Kit

Used or tested for OCR-related functionality.

## Document AI

Considered / tested for more advanced document recognition.

## OpenCV

Used or considered for image-processing tasks such as:

- edge detection
- image correction
- document preprocessing

## PostgreSQL

Planned as a possible future structured database.

## pgvector

Planned as a possible future extension for semantic document search.

---

# 21. Current implementation status

The project is already more than a theoretical concept.

Several components have been implemented, tested or partially integrated.

These include:

- mobile application structure
- camera access
- document scanning
- document image handling
- OCR
- document text extraction
- first document classification logic
- document storage experiments
- PDF handling
- first AI integration
- Gemini API integration
- GitHub repository
- Expo project structure
- multilingual planning

However, the individual components are not yet stable enough to work together as one reliable production system.

---

# 22. Current known problems

## Slow processing

Some operations currently take too long.

In certain cases, processing can take approximately 30 seconds or more.

The user should not have to wait this long for normal document analysis.

The architecture must therefore be optimized.

---

## OCR reliability

OCR does not currently recognize every document reliably.

After some improvements to the scanner, OCR performance became worse.

This indicates that image preprocessing and OCR are not yet correctly balanced.

---

## Document detection

Automatic document-edge detection is still unreliable.

The app does not always correctly identify where the document starts and ends.

---

## Scanner quality

The camera result does not yet consistently look like a professional document scanner.

Further improvements are needed for:

- perspective correction
- contrast
- brightness
- sharpness
- automatic cropping

---

## Internal logic

When one component is modified, another component can become unstable.

For example:

scanner improvement → OCR regression

or:

OCR changes → document interpretation problems

This suggests that the application architecture needs better separation between components.

---

## Memory / retrieval

The internal document memory is not yet reliable enough.

The app must be able to retrieve previously stored documents and information consistently.

---

## PDF handling

There have been problems with:

- PDF creation
- saving
- reopening
- downloading

This part still requires stabilization.

---

## Processing pipeline

The complete processing pipeline is not yet stable:

camera  
↓  
scanner  
↓  
image preprocessing  
↓  
OCR  
↓  
document analysis  
↓  
classification  
↓  
storage  
↓  
search

An error in an early stage can reduce the quality of every later stage.

---

# 23. Architecture requirement

The different parts of the application should be separated into independent modules.

For example:

### Scanner Service

Responsible only for image capture and preprocessing.

### OCR Service

Responsible only for text recognition.

### Document Analysis Service

Responsible for document understanding.

### Classification Service

Responsible for categories.

### Storage Service

Responsible for document persistence.

### Search Service

Responsible for retrieval.

### Reminder Service

Responsible for deadlines and notifications.

### Communication Service

Responsible for email and generated replies.

This should make the application easier to debug and maintain.

---

# 24. DSGVO / GDPR

Data protection is a critical requirement of Documenta.

The application may process highly sensitive personal data.

Examples:

- bank information
- insurance documents
- tax documents
- contracts
- addresses
- invoices
- government correspondence
- school records
- university records

Therefore, the final application must be designed for GDPR / DSGVO compliance.

Important requirements include:

- data minimization
- purpose limitation
- encryption
- secure authentication
- secure storage
- deletion of personal data
- export of personal data
- clear user consent
- transparent processing
- access control
- protection of API keys
- secure communication
- logging of sensitive operations where appropriate

Whenever possible, sensitive processing should happen locally on the device.

If an external AI service receives document data, the user must know:

- what data is transferred
- why it is transferred
- where it is processed
- how long it is stored
- how it can be deleted

The final architecture must be reviewed carefully before real personal documents are processed in a production environment.

---

# 25. Local vs cloud processing

One of the main architectural questions is which operations should happen locally and which should use cloud services.

Possible local processing:

- camera
- image preprocessing
- basic OCR
- encryption
- local document storage

Possible cloud processing:

- advanced OCR
- AI document interpretation
- semantic search
- language processing

The final design should minimize unnecessary transmission of private documents.

---

# 26. Free and paid services

The project currently uses or evaluates services with different pricing models.

Some development tools can be used free of charge within certain limits.

Other services become paid after:

- free credits are exhausted
- API usage exceeds a free quota
- cloud storage exceeds a limit
- build limits are exceeded

The exact pricing must be checked before production deployment because API and cloud-service prices can change.

The application itself may later use a subscription model.

An earlier pricing idea was approximately:

**€9.90 per month**

This is not a final commercial decision.

---

# 27. Current project stage

Documenta is currently a development prototype.

It is not production-ready.

The current focus is:

1. stabilize document scanning
2. improve OCR reliability
3. improve architecture
4. separate individual services
5. improve document storage
6. improve search and memory
7. design DSGVO-compliant data handling
8. reduce processing time

---

# 28. Long-term goal

The final goal is to create an application where the user does not have to manually manage thousands of files.

Instead, Documenta should become an intelligent personal document assistant.

The user should be able to simply provide documents and later ask questions naturally.

Documenta should know:

- what documents exist
- what they contain
- how they are related
- where they belong
- which deadlines exist
- which actions are necessary
- how to retrieve them again

---

# 29. Questions currently open

I am particularly interested in technical feedback regarding:

### Architecture

How should the individual modules be separated so that changes in one component do not break another component?

### OCR pipeline

Which OCR architecture would provide good recognition quality without creating excessive processing time or cost?

### Storage

Should documents be stored locally, in cloud storage, or in a hybrid architecture?

### Semantic search

Would PostgreSQL + pgvector be an appropriate architecture for intelligent document retrieval?

### Mobile development

Is React Native + Expo suitable for a project with this level of camera, OCR and document-processing functionality?

### DSGVO

Which parts of the architecture should be processed locally to minimize privacy risks?

### AI

Which tasks should use AI and which should use deterministic programming instead?

### Performance

How should the processing pipeline be redesigned to avoid 30+ second waiting times?

---

# 30. Development principle

Documenta should not simply be an AI wrapper.

The goal is to build a structured software system in which AI is only one component.

Traditional programming should handle deterministic tasks such as:

- file management
- storage
- authentication
- encryption
- metadata
- permissions
- notifications
- validation

AI should mainly be used where interpretation is necessary, for example:

- understanding document content
- semantic classification
- natural-language search
- summarization
- text generation

---

# Project status

**Work in progress / experimental prototype**

The repository currently contains experimental code, incomplete modules and known bugs.

It should not yet be used for storing real sensitive documents in a production environment.
