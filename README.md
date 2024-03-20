# SVG-Extract

Extracts inline SVGs into separate files, and imports them back. It supports `TypeScript`, `JavaScript`, `Astro`, etc.

<img src="images/icon.png" alt="Icon" width="200" height="200">

## How to use

1. Select the SVG you want to extract in the editor and run the `Extract SVG` command from the command palette (`Ctrl+Shift+P`).

![Selecting](/images/0.jpg)

2. Enter the import path for the svg file based on the preview and press `Enter`.

![Naming](/images/1.jpg)

2. Select the import method you want to use (raw content or as an asset) depending on your build system and press `Enter`.

![Import Type](/images/2.jpg)

3. Select the expression type you want to use (e.g. Fragment, innerHTML, et.c) depending on your framework and press `Enter`.

![Expression Type](/images/3.jpg)

3. The file will be updated to import the new svg file.

![After](/images/4.jpg)

## Demo (JSX)

Given the following JSX file:

```jsx
function Test() {
  return (
    <div id="some_button">
      <svg fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <path
          fill-rule="evenodd"
          d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
          clip-rule="evenodd"
        ></path>
      </svg>
    </div>
  )
}
```

By selecting the raw content import method and innerHTML expression type (e.g. Solid-js), the file will be updated to:

```tsx
import svg_1ZU9X from "./svg_1ZU9X.svg?raw"

function Test() {
  return (
    <div id="some_button">
      <span innerHTML={svg_1ZU9X} />
    </div>
  )
}
```

This sets the `innerHTML` of the `span` to the SVG content.

## Demo (Astro)

Given the following Astro file:

```jsx
---
---

<div id="some_button">
  <svg fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"
    ><path
      fill-rule="evenodd"
      d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
      clip-rule="evenodd"></path></svg
  >
</div>
```

After selecting the SVG and running the `Extract SVG` command, the file will be updated to:

```jsx
---
import chevron_left from "./chevron_left.svg?raw"

---

<div id="some_button">
  <Fragment set:html={chevron_left} />
</div>
```

And file `chevron_left.svg` will be created in the same directory as the original file.
