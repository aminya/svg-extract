import vscode, { Position } from "vscode"
import { async as hash } from "hasha"
import { dirname, join } from "path"
import fs from "fs"
import { preview } from "./svg-preview"

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
  const fileName = await addExtractedFile(selection, editor)

  // remove the selected code from the original file
  await deleteSelection(selection, editor)

  // import the extracted file back to the original file
  await importExtractedSvg(selection, editor, fileName)
}

async function deleteSelection(selection: vscode.Selection, varEditor: vscode.TextEditor) {
  await varEditor.edit((edit) => {
    edit.delete(selection)
  })
}

async function addExtractedFile(selection: vscode.Selection, constEditor: vscode.TextEditor) {
  const svg = constEditor.document.getText(selection)
  const editorPath = constEditor.document.fileName

  const contentHash = await hash(svg, { algorithm: "md5" })

  // generate a preview of the extracted svg
  const panel = preview(svg)

  // ask the user for the file name
  let fileName =
    (await vscode.window.showInputBox({
      prompt: "Enter the SVG file name (without using spaces or special characters)",
      value: `svg_${contentHash}`,
    })) ?? `svg_${contentHash}`

  panel?.dispose()

  // replace spaces and special characters with underscores
  fileName = fileName.replace(/[^a-zA-Z0-9_]/gi, "_")

  const filePath = join(dirname(editorPath), `${fileName}.svg`)

  // write the content to a new file
  fs.writeFileSync(filePath, svg, "utf-8")

  return fileName
}

async function importExtractedSvg(selection: vscode.Selection, varEditor: vscode.TextEditor, fileName: string) {
  const language = varEditor.document.languageId

  if (language === "astro") {
    await varEditor.edit((edit) => {
      // insert the imports after --- in astro files
      const regex = /^---/m
      const match = varEditor.document.getText().match(regex)
      const line =
        match !== null && match.index !== undefined
          ? varEditor.document.positionAt(match.index + match[0].length).line + 1
          : 0

      edit.insert(new Position(line, 0), `import ${fileName} from "./${fileName}.svg?raw"\n`)
      edit.insert(selection.start, `<Fragment set:html={${fileName}} />\n`)
    })
  } else {
    await varEditor.edit((edit) => {
      edit.insert(new Position(0, 0), `import ${fileName} from "./${fileName}.svg?raw"\n`)
      edit.insert(selection.start, `{${fileName}}\n`)
    })
  }
}
