import vscode, { Position } from "vscode"
import { basename, dirname, extname, join, relative, resolve } from "path"
import fs from "fs"
import { preview } from "./svg-preview"
import { nanoid } from "nanoid"

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(vscode.commands.registerCommand("svgExtract.extract", moveSelectionsToNewFile))
}

export function deactivate() {}

async function moveSelectionsToNewFile() {
  const editor = vscode.window.activeTextEditor
  if (editor === undefined) {
    return
  }

  const selections = editor.selections
  if (selections.length >= 2) {
    await vscode.window.showErrorMessage("Only one selection is allowed")
    return
  }

  await moveSelectionToNewFile(selections[0], editor)
}

async function moveSelectionToNewFile(selection: vscode.Selection, editor: vscode.TextEditor) {
  // extract the code to a new file
  const importInfo = await addExtractedFile(selection, editor)

  if (importInfo === undefined) {
    return
  }

  // remove the selected code from the original file
  await deleteSelection(selection, editor)

  // import the extracted file back to the original file
  await importExtractedSvg(selection, editor, importInfo)
}

async function deleteSelection(selection: vscode.Selection, varEditor: vscode.TextEditor) {
  await varEditor.edit((edit) => {
    edit.delete(selection)
  })
}

async function addExtractedFile(selection: vscode.Selection, constEditor: vscode.TextEditor) {
  const svg = constEditor.document.getText(selection)

  // generate a preview of the extracted svg
  const panel = preview(svg)
  if (panel === undefined) {
    return undefined
  }

  const importInfo = await getImportInfo(constEditor)

  panel?.dispose()

  // write the content to a new file
  const filePath = resolve(join(importInfo.importBase, importInfo.importPath))
  fs.writeFileSync(filePath, svg, "utf-8")

  return importInfo
}

type ImportInfo = {
  /** The relative path of the file with respect to the editor folder */
  importPath: string
  /** The folder of the current editor */
  importBase: string
  /** The name of the import */
  importName: string
}

async function getImportInfo(constEditor: vscode.TextEditor): Promise<ImportInfo> {
  const defaultImportInfo = await generateDefaultImportInfo(constEditor)

  // ask the user for the import path
  let importPath =
    (await vscode.window.showInputBox({
      prompt: "Enter the SVG import path (a relative path to the current file)",
      value: defaultImportInfo.importPath,
    })) ?? defaultImportInfo.importPath

  // check if the file is absolute (cross-platform)
  if (isAbsolutePath(importPath)) {
    vscode.window.showWarningMessage("The import path must be relative to the current file")
    importPath = relative(defaultImportInfo.importBase, resolve(importPath))
  }

  // add ./ to the import path if it doesn't start with it
  if (!importPath.startsWith(".")) {
    importPath = `./${importPath}`
  }

  // Create the import name from the file name (replace spaces and special characters with underscores)
  const extension = extname(importPath)
  const importName = basename(importPath, extension).replace(/[^a-zA-Z0-9_]/gi, "_")

  return {
    importPath,
    importBase: defaultImportInfo.importBase,
    importName,
  }
}

function isAbsolutePath(importPath: string) {
  return importPath.startsWith("/") || importPath.match(/^[a-zA-Z]:\\/)
}

/** Generate the default import info for the extracted svg */
async function generateDefaultImportInfo(constEditor: vscode.TextEditor): Promise<ImportInfo> {
  const editorPath = constEditor.document.fileName
  const importBase = dirname(editorPath)

  // generate a hash from the svg content
  const identifier = nanoid(5).replace(/-/g, "_")

  return {
    importPath: `./svg_${identifier}.svg`,
    importBase,
    importName: `Svg${identifier}`,
  }
}

async function importExtractedSvg(selection: vscode.Selection, varEditor: vscode.TextEditor, importInfo: ImportInfo) {
  const language = varEditor.document.languageId

  let position: Position
  if (language === "astro") {
    // insert the imports after --- in astro files
    const regex = /^---/m
    const match = varEditor.document.getText().match(regex)
    const line =
      match !== null && match.index !== undefined
        ? varEditor.document.positionAt(match.index + match[0].length).line + 1
        : 0

    position = new Position(line, 0)
  } else {
    position = new Position(0, 0)
  }

  // edit.insert(selection.start, `<Fragment set:html={${importInfo.importName}} />\n`)

  // ask the user which import to use
  const importTypes = [
    { label: "raw content", description: `import ${importInfo.importName} from "${importInfo.importPath}?raw"` },
    { label: "asset", description: `import ${importInfo.importName} from "${importInfo.importPath}"` },
  ]
  let importType = await vscode.window.showQuickPick(importTypes)
  if (importType === undefined) {
    importType = importTypes[0]
  }

  // ask the user which import to use
  let expressions: { label: string; description: string }[] = [
    { label: "inline innerHTML (e.g. Solid-js)", description: `<span innerHTML={${importInfo.importName}} />` },
    {
      label: "inline dangerouslySetInnerHTML (e.g. React)",
      description: `<span dangerouslySetInnerHTML={{ __html: ${importInfo.importName} }} />`,
    },
    {
      label: "image src",
      description: `<img src={${importInfo.importName}.src} alt="${importInfo.importName} SVG" />`,
    },
    { label: "custom", description: `{${importInfo.importName}}` },
  ]

  if (language === "astro") {
    expressions = [
      { label: "Fragment (e.g. Astro)", description: `<Fragment set:html={${importInfo.importName}} />` },
      ...expressions,
    ]
  }

  let expression = await vscode.window.showQuickPick(expressions)
  if (expression === undefined) {
    expression = expressions[0]
  }

  await varEditor.edit(async (edit) => {
    edit.insert(position, importType.description + "\n")
    edit.insert(selection.start, expression.description + "\n")
  })
}
