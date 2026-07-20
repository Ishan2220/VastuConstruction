const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client', 'src', 'pages', 'DashboardPage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

const startMarker = '{/* Site Add/Edit Modal */}';
const endMarker = '{/* Create Project Modal (API) */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    content = content.substring(0, startIndex) + content.substring(endIndex);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log("Successfully removed old modals");
} else {
    console.error("Markers not found");
}
