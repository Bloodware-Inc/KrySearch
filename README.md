# KrySearch

**KrySearch** is a privacy-first, open-source search router built for **Krynet, LLC**. It routes your searches through multiple engines while ensuring no personal data is logged or stored. **KrySearch** is fully **GNU General Public License (GPL) 3.0**-licensed.

KrySearch provides users with a way to search the web privately, without the tracking or ads that come with traditional search engines. It also allows users to choose between a variety of search engines, enhancing their control over their privacy and online footprint.

---

## Features
[![LibreJS Compatible](https://img.shields.io/badge/LibreJS-OK-success?style=flat)](https://www.gnu.org/software/librejs/)
- **Privacy-Focused**: Does not collect or store any user data.
- **Open Source**: Fully open-source and licensed under the **GNU GPL 3.0**.
- **No Tracking**: No user tracking or personalized ads.
- **Encrypted**: All search queries are routed securely over HTTPS.
- **Multiple Search Engines**: Users can choose between a variety of search engines, including both open-source and closed-source options.
- **No Cookies**: No cookies are used, ensuring full anonymity during searches.
- **CSP and CORS Safe**: Works seamlessly with Content Security Policies (CSP) and Cross-Origin Resource Sharing (CORS), making it compatible with platforms like GitHub Pages.
- **No Ads or Personalization**: Unlike traditional search engines, KrySearch doesn't show personalized ads or track users.
- **Encrypted Relay for search queries**
- **Hybrid Post-Quantum + Classical Crypto**
- **Search Isolation to prevent any leaks**
- **Fully Zero-Knowledge — KrySearch never stores, logs, or sees your queries**
- **HTTPS-only enforcement for ?url= redirects**
- **CSP-compliant and XSS-safe**

## License
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
KrySearch is licensed under the **GNU General Public License v3.0**. You can view the full text of the license in the [LICENSE](LICENSE) file.

---

## How It Works

**KrySearch** operates as a **search router**, routing queries to search engines of your choice while protecting your privacy. Here’s how it works:

1. **User Input**: You enter a query or URL into the search bar.
2. **Search Routing**: The query is routed to the selected search engine without any tracking or storage of personal data.
3. **Return Results**: The results are displayed directly from the search engine, with no intermediary tracking or modification.

KrySearch supports multiple search engines, including privacy-focused open-source engines and traditional closed-source ones. You can switch between them according to your needs.

---

## Installation

To get started with **KrySearch**, follow these steps:

### Prerequisites
- A modern browser (Chrome, Firefox, Edge, Safari)
- Basic knowledge of how to deploy web projects

### Steps:
1. **Clone the repository**:
   ```bash
   git clone https://github.com/Bloodware-Inc/KrySearch.git
Navigate to the project directory:
   ```bash
cd KrySearch
```
Open index.html in your browser, or deploy it to a server.

Deployment on GitHub Pages
If you want to deploy KrySearch on GitHub Pages, follow these steps:

Push the code to your GitHub repository.

Go to your repository’s Settings page.

Scroll down to GitHub Pages and set the source branch to main or gh-pages.

Once saved, your KrySearch instance should be live and accessible.

Usage
Search: Enter a search query in the search bar. You can also paste URLs directly into the search bar.

Select Engine: Choose your preferred search engine from the dropdown menu. KrySearch supports both open-source and closed-source engines.

Privacy Mode: All queries are performed in private mode to ensure your privacy.

Query Parameters:

?q=<query>: Use this parameter for a search query.

?url=<url>: Use this parameter to visit a direct URL.
Example:

https://yourdomain.com/?q=privacy

https://yourdomain.com/?url=https://example.com

Supported Search Engines
Open Source: DuckDuckGo, StartPage, Qwant, and more.

Closed Source: Google, Bing, and others.

Privacy and Security
KrySearch is designed with user privacy at its core. Here’s how it keeps your searches private:

No Data Collection: KrySearch does not collect or store any data from your searches. It simply routes your queries to search engines.

No Cookies: KrySearch does not use cookies or any form of local storage, ensuring your browsing remains anonymous.

Secure Connections: All requests are made over HTTPS to ensure your queries remain private and cannot be intercepted.

No Personalization: Unlike many search engines, KrySearch does not show personalized ads or track users.

Contributing
We welcome contributions to KrySearch! If you'd like to enhance KrySearch, add new features, or fix bugs, here's how to get started:

Steps for Contributing:
Fork the repository on GitHub.

Clone your forked repository:
```bash
git clone https://github.com/YOUR_USERNAME/KrySearch.git
```
Create a new branch for your changes:
```bash
git checkout -b feature-branch
```
Make your changes. You can add new features, improve the UI, optimize the code, or implement new search engines.

Test your changes thoroughly to ensure they work correctly and do not break any existing functionality.

Commit your changes:
```bash
git commit -am 'Add feature or fix bug'
```
Push to your branch:

git push origin feature-branch
Open a pull request with a description of the changes you made.

We also encourage users to create issues if they encounter bugs or want to request new features.

Ideas for Contribution:
Add support for more search engines.

Integrate more privacy features.

Improve the user interface.

Enhance error handling and recovery.

Extending KrySearch
KrySearch is open-source, and you can easily extend it with additional functionality. Here are some ideas if you want to add more features:

Adding a New Search Engine
You can extend KrySearch to include more search engines by modifying the search.js file. The search engine configuration is stored in the CONFIG object, which can be extended with more search engines.

Example:
```javascript
const engines = { 
  ...CONFIG.engines.open_source, 
  ...CONFIG.engines.closed_source,
  'new-engine': {
    name: 'New Engine',
    base: 'https://newengine.com/search?q=',
    mode: 'query'
  }
};
```
Customizing the UI
Feel free to modify the HTML and CSS to customize the appearance of KrySearch. For instance, you can change the theme, layout, or button styles to match your brand or personal preference.

Using External Plugins
You can also extend KrySearch using JavaScript plugins. To create a plugin, simply write your script and push it into the window.KRY_PLUGINS array. For example:
```javascript
window.KRY_PLUGINS.push({
  id: 'new-feature',
  description: 'Adds new feature to KrySearch',
  run() {
    // Add your custom logic here
  }
});
```
Make sure to follow the best practices for privacy and security when adding new features.

# About Krynet, LLC
Krynet, LLC is a privacy-first technology company committed to creating tools and services that prioritize user security and data protection. KrySearch is part of the Krynet ecosystem, which aims to provide secure, transparent, and privacy-respecting alternatives to traditional internet services.

For more information about Krynet, LLC and its mission, visit Krynet.ai.

## Contact
Email: contact@krynet.ai
Website: https://krynet.ai
---

### Key Updates for Extensibility:

1. **Extending the Search Engines**: Added instructions for users to add more search engines to KrySearch by editing the `search.js` file.
2. **Customizing the UI**: Provided instructions for users to customize the look and feel of KrySearch.
3. **Using Plugins**: Mentioned how users can write and add external plugins to extend the functionality of KrySearch.
4. **Contribution Guidelines**: Updated the contributing section with clear steps, ideas for features, and how to submit pull requests.
5. **Open Source Freedom**: Reinforced the idea that KrySearch is open-source and can be modified and extended based on users' needs.
