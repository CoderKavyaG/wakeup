const fs = require('fs');

const path = 'src/components/widgets/ProjectsWidget.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Extract and remove the Dialogs from the header (lines 381-485 approx)
// The block starts with `<Dialog open={isImportModalOpen}` and ends with `</Dialog>\n        </div>\n\n        <div className="flex-1 flex flex-col min-h-0">`
const extractRegex = /<Dialog open=\{isImportModalOpen\}[\s\S]*?<\/Dialog>\s*\{\/\* Hidden Dialog for Edit First \*\/\}[\s\S]*?<\/Dialog>/;

const match = content.match(extractRegex);
if (!match) {
  console.log("Could not find dialogs to extract.");
  process.exit(1);
}

const dialogsContent = match[0];
content = content.replace(extractRegex, '');

// 2. Insert the Dialogs + new Link Dialog at the end of the file, right before the last closing </div>
const insertPointRegex = /(<Dialog open=\{!!viewNote\}[\s\S]*?<\/Dialog>\s*\}\)\s*)(<\/div>\s*\);\s*\})/;
const linkDialog = `
      {/* Link Local Folder Dialog */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="bg-[#0f0f11] border-white/10 text-foreground">
          <DialogHeader>
            <DialogTitle>Link Local Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Paste local folder path</label>
              <Input value={linkPath} onChange={e => setLinkPath(e.target.value)} className="bg-transparent border-white/10" placeholder="C:\\Projects\\my-app" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkModalOpen(false)} className="border-white/10 bg-transparent">Cancel</Button>
            <Button onClick={handleLinkFolder} disabled={!linkPath.trim() || linkScanning}>
              {linkScanning ? "Linking..." : "Link Folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
`;

content = content.replace(insertPointRegex, `$1\n      ${dialogsContent}\n${linkDialog}\n$2`);

// 3. Add "+ Import Local Project" button to the Local tab
// Look for `{activeListTab === "local" && (\n              <>`
const localTabRegex = /(\{activeListTab === "local" && \(\s*<>)/;
const importButton = `
              <div className="px-2 pt-2 pb-1">
                <Button 
                  onClick={() => setIsImportModalOpen(true)}
                  className="w-full bg-white/5 hover:bg-white/10 text-foreground border border-white/10 border-dashed py-5 flex items-center justify-center gap-2 transition-all duration-300 group"
                >
                  <div className="w-6 h-6 rounded bg-primary/20 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm">Import Local Project</span>
                </Button>
              </div>`;

content = content.replace(localTabRegex, `$1${importButton}`);

// 4. Add "Link Local Folder" button to Detail View for GitHub projects
// Look for `{selectedProject.githubUrl && (\n                  <a href={selectedProject.githubUrl}`
// But wait, it's easier to put it below the github/live links.
const linksRegex = /(<ExternalLink className="w-3 h-3" \/> Live\s*<\/a>\s*\)\}\s*<\/div>)/;
const linkFolderButton = `
              {!selectedProject.folderPath && selectedProject.githubUrl && (
                <div className="pt-2">
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => setIsLinkModalOpen(true)}
                    className="h-7 text-[10px] bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 w-full flex items-center justify-center gap-1.5"
                  >
                    <Folder className="w-3.5 h-3.5" /> Link Local Folder
                  </Button>
                </div>
              )}`;

content = content.replace(linksRegex, `$1\n${linkFolderButton}`);

fs.writeFileSync(path, content, 'utf8');
console.log("Refactor successful.");
