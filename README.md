# Buraha

**B**l**ur**"Yet **A**nother"**Ha**sh &mdash; A performance enhanced version of the BlurHash decoder at the expense of visual integrity.

[In-browser Benchmark is available](https://misskey-dev.github.io/buraha/)

| Buraha | BlurHash |
|-|-|
| ![](https://user-images.githubusercontent.com/20679825/236821808-e200451a-73ff-42db-b849-94168d60e8b8.png) | ![](https://user-images.githubusercontent.com/20679825/236821838-46bf311c-001c-4d15-addd-ba07eaae4ef9.png) |

## Usage

The API is provided only for decoding on the browser.
You can use BlurHash's library to encode it.

### Installation

```bash
npm install buraha
```

### API

```typescript
export function render(source: string, target: HTMLCanvasElement | OffscreenCanvas, punch?: number): void;
```
