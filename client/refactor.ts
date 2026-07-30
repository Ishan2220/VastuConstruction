import { Project, SyntaxKind } from 'ts-morph';
import * as fs from 'fs';

const project = new Project();
project.addSourceFilesAtPaths('src/pages/**/*.tsx');

const files = project.getSourceFiles();

let updatedFiles = 0;

for (const file of files) {
  let hasConfirm = false;

  file.forEachDescendant(node => {
    if (node.getKind() === SyntaxKind.CallExpression) {
      const callExpr = node.asKind(SyntaxKind.CallExpression);
      if (callExpr) {
        const expression = callExpr.getExpression();
        const text = expression.getText();
        if (text === 'confirm' || text === 'window.confirm') {
          hasConfirm = true;
        }
      }
    }
  });

  if (!hasConfirm) continue;
  
  console.log(`Processing ${file.getBaseName()}...`);

  // 1. Add import
  const imports = file.getImportDeclarations();
  const hasUseConfirm = imports.some(imp => imp.getModuleSpecifierValue() === '@/components/ui/ConfirmProvider');
  if (!hasUseConfirm) {
    file.addImportDeclaration({
      namedImports: ['useConfirm'],
      moduleSpecifier: '@/components/ui/ConfirmProvider',
    });
  }

  // 2. Add const confirm = useConfirm(); to the main component
  const defaultExport = file.getDefaultExportSymbol();
  if (defaultExport) {
    const decl = defaultExport.getDeclarations()[0];
    if (decl && decl.getKind() === SyntaxKind.FunctionDeclaration) {
      const funcDecl = decl.asKind(SyntaxKind.FunctionDeclaration);
      if (funcDecl) {
        const statements = funcDecl.getStatements();
        const hasConfirmDecl = statements.some(s => s.getText().includes('useConfirm()'));
        if (!hasConfirmDecl) {
          funcDecl.insertStatements(0, 'const confirmDialog = useConfirm();');
        }
      }
    }
  }

  // 3. Replace confirm() and window.confirm() with await confirmDialog()
  const replacements: { node: any, replacement: string, isAsyncContainer: boolean, containerNode: any }[] = [];

  file.forEachDescendant(node => {
    if (node.getKind() === SyntaxKind.CallExpression) {
      const callExpr = node.asKind(SyntaxKind.CallExpression);
      if (callExpr) {
        const text = callExpr.getExpression().getText();
        if (text === 'confirm' || text === 'window.confirm') {
          const args = callExpr.getArguments();
          const messageNode = args[0];
          const messageText = messageNode ? messageNode.getText() : "'Are you sure?'";
          
          let containerNode = node.getParentWhile(p => 
            p.getKind() !== SyntaxKind.ArrowFunction && 
            p.getKind() !== SyntaxKind.FunctionDeclaration && 
            p.getKind() !== SyntaxKind.FunctionExpression
          );
          
          let parentFunc = containerNode ? containerNode.getParent() : null;

          replacements.push({
            node: callExpr,
            replacement: `await confirmDialog({ title: 'Confirm Action', message: ${messageText} })`,
            isAsyncContainer: parentFunc ? parentFunc.getText().startsWith('async') : false,
            containerNode: parentFunc
          });
        }
      }
    }
  });

  // Make parent functions async
  for (const rep of replacements) {
    if (rep.containerNode && !rep.containerNode.getText().startsWith('async')) {
      if (rep.containerNode.getKind() === SyntaxKind.ArrowFunction) {
        rep.containerNode.setIsAsync(true);
      } else if (rep.containerNode.getKind() === SyntaxKind.FunctionExpression || rep.containerNode.getKind() === SyntaxKind.FunctionDeclaration) {
        rep.containerNode.setIsAsync(true);
      }
    }
  }

  // Replace text
  // ts-morph node.replaceWithText does not work well in a loop if positions change, 
  // so we apply from bottom to top.
  const sortedReplacements = replacements.sort((a, b) => b.node.getPos() - a.node.getPos());
  for (const rep of sortedReplacements) {
    rep.node.replaceWithText(rep.replacement);
  }

  file.saveSync();
  updatedFiles++;
}

console.log(`\nUpdated ${updatedFiles} files.`);
