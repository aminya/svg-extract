import * as vscode from "vscode"

const svgRegex = /\s*<\s*svg[^>]*>[\s\S]*<\/svg\s*>\s*/i

export function preview(svg: string) {
  if (!svgRegex.test(svg)) {
    vscode.window.showErrorMessage("Please select a valid SVG element in the editor.")
    return
  }

  const currentPanel = showSVGPanel(svg)
  currentPanel.reveal()
  return currentPanel
}

function showSVGPanel(svg: string) {
  const panel = vscode.window.createWebviewPanel(`svgViewer`, `SVG Extract`, vscode.ViewColumn.Beside)
  panel.webview.html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Svg Extract</title>
    <style>
      body {
        display: grid;
        place-items: center;
        height: 100vh;
      }
    </style>
  </head>
  <body>
    ${svg}
  </body>
</html>`

  return panel
}
