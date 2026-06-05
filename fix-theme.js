const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
}

let modifiedFiles = 0;

walk('src', (filePath) => {
  if (!filePath.endsWith('.tsx')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Replace bg-white/X with bg-foreground/X
  content = content.replace(/bg-white\/(\d+)/g, 'bg-foreground/$1');
  
  // 1.5 Handle custom opacity like bg-white/[0.08]
  content = content.replace(/bg-white\/\[([0-9.]+)\]/g, 'bg-foreground/[$1]');

  // 2. Replace border-white/X with border-foreground/X
  content = content.replace(/border-white\/(\d+)/g, 'border-foreground/$1');
  
  // 2.5 Handle custom opacity like border-white/[0.08]
  content = content.replace(/border-white\/\[([0-9.]+)\]/g, 'border-foreground/[$1]');

  // 3. Replace text-white/X with text-foreground/X
  content = content.replace(/text-white\/(\d+)/g, 'text-foreground/$1');
  
  // 3.5 Handle custom opacity like text-white/[0.02]
  content = content.replace(/text-white\/\[([0-9.]+)\]/g, 'text-foreground/[$1]');

  // 4. Replace text-white with text-foreground, but ONLY if the line doesn't contain a solid bg color.
  const lines = content.split('\n');
  const newLines = lines.map(line => {
    // If the line has a solid bg color like bg-blue-500, bg-orange-600, etc., we probably want to keep text-white
    const hasSolidBg = /bg-(blue|emerald|amber|orange|rose|sky|teal|red|indigo)-[567]00/.test(line) || /from-(rose|blue|emerald|orange|amber|indigo)-/.test(line);
    
    if (hasSolidBg && line.includes('text-white')) {
      return line; // keep text-white
    }

    // Otherwise, replace text-white with text-foreground
    return line.replace(/\btext-white\b(?!\/)/g, 'text-foreground');
  });

  content = newLines.join('\n');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles++;
    console.log('Updated:', filePath);
  }
});

console.log('Total files modified:', modifiedFiles);
