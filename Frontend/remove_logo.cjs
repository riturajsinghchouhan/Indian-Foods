const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      if (content.includes('quickSpicyLogo')) {
        // Remove import
        content = content.replace(/import\s+quickSpicyLogo\s+from\s+["']@food\/assets\/quicky-spicy-logo\.png["'];?\n?/g, '');
        
        // Remove fallback assignment (src={logoUrl || quickSpicyLogo})
        content = content.replace(/\|\|\s*quickSpicyLogo/g, '');
        
        // Remove fallback useState(quickSpicyLogo) -> useState(null)
        content = content.replace(/useState\(quickSpicyLogo\)/g, 'useState(null)');
        
        // Remove onError fallback logic
        content = content.replace(/onError=\{\(e\)\s*=>\s*\{\s*if\s*\(e\.target\.src\s*!==\s*quickSpicyLogo\)\s*\{\s*e\.target\.src\s*=\s*quickSpicyLogo;?\s*\}\s*\}\}/g, "onError={(e) => { e.target.style.display = 'none'; }}");
        
        // Remove direct usage <img src={quickSpicyLogo} ... />
        content = content.replace(/<img[^>]*src=\{quickSpicyLogo\}[^>]*\/>\s*/g, '');

        fs.writeFileSync(fullPath, content);
        console.log('Updated', fullPath);
      }
    }
  }
}

processDir(path.join(process.cwd(), 'src/modules/Food'));
