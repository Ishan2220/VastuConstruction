import https from 'https';

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  const html = await fetchUrl('https://vastu-construction.vercel.app/');
  
  // Extract all JS files
  const scriptRegex = /<script[^>]+src="([^">]+)"/g;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    let scriptUrl = match[1];
    if (scriptUrl.startsWith('/')) {
      scriptUrl = 'https://vastu-construction.vercel.app' + scriptUrl;
    }
    console.log('Fetching', scriptUrl);
    const js = await fetchUrl(scriptUrl);
    
    // look for URLs
    const urlRegex = /https:\/\/[a-zA-Z0-9.-]+(?:onrender\.com|railway\.app|herokuapp\.com|up\.railway\.app)[^"']*/g;
    const urls = js.match(urlRegex);
    if (urls) {
      console.log('Found backend URLs:', new Set(urls));
    }
  }
}
main().catch(console.error);
