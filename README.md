# DocuExtract AI 🤖

DocuExtract AI is an intelligent document data extraction tool that uses AI to automatically parse and structure data from DOCX and PDF documents. Define your schema once, and extract structured data from multiple documents instantly.

## 🌟 Features

- 📄 Support for DOCX and PDF documents
- 🎯 Custom schema definition with multiple data types
- 🔄 Batch processing of multiple documents
- 🎨 Interactive UI for schema building
- 📊 Real-time preview of extracted data
- 🔍 Source text highlighting for extracted values
- ⬇️ Export results in JSON format
- 🔐 Bring your own OpenAI API key

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository:

```bash
git clone https://github.com/Bukareszt/DocuExtract.git
cd DocuExtract-AI
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🛠️ Usage

1. **Define Your Schema**
   - Create fields with various data types (string, number, boolean, date, enum, array)
   - Set fields as required or optional
   - Define nested object structures for arrays
   - Preview the expected data structure in real-time

2. **Upload Documents**
   - Drag and drop or select DOCX/PDF files
   - Support for multiple documents
   - Instant file type validation

3. **Process Documents**
   - Enter your OpenAI API key
   - Process all documents against your defined schema
   - View extraction progress in real-time

4. **Review and Export**
   - Interactive view of extracted data
   - Side-by-side comparison with source text
   - Highlight matching text on hover
   - Download individual or all results as JSON

## 📝 Supported Data Types

- `string`: Text values
- `number`: Numeric values
- `boolean`: True/false values
- `date`: Date values
- `enum`: Predefined set of values
- `array`: Lists of values or objects
  - Simple arrays (strings, numbers, booleans)
  - Complex arrays of objects with custom schemas

## 🔒 Security & Privacy

- No server-side data storage
- Client-side document processing
- Your OpenAI API key is never stored
- Documents are processed locally
- Secure data handling with type validation

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please make sure to update tests as appropriate and follow the existing code style.

## 🐛 Bug Reports

Found a bug? Please open an issue with:

- Clear bug description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Your environment details

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- AI powered by [OpenAI](https://openai.com/)
- UI styled with [Tailwind CSS](https://tailwindcss.com/)
- Document parsing:
  - PDF: [pdf-parse](https://www.npmjs.com/package/pdf-parse)
  - DOCX: [officeparser](https://www.npmjs.com/package/officeparser)

## 📧 Contact & Support

- Create an issue for bug reports
- Start a discussion for feature requests
- Star the project if you find it useful!

Project Link: [https://github.com/yourusername/DocuExtract-AI](https://github.com/yourusername/DocuExtract-AI)
