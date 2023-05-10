# Buraha

**B**l**ur**"Yet **A**nother"**Ha**sh &mdash; A performance enhanced version of the BlurHash decoder at the expense of visual integrity.

[In-browser Benchmark is available](https://misskey-dev.github.io/buraha/)

| Buraha | BlurHash |
|-|-|
| ![](https://github.com/misskey-dev/buraha/assets/20679825/b150d3fa-5f8e-49f0-9104-c17e1e2ce129) | ![](https://github.com/misskey-dev/buraha/assets/20679825/8912d5d3-de56-4ff3-a1a0-251683c26704) |
| ![](https://user-images.githubusercontent.com/20679825/236821808-e200451a-73ff-42db-b849-94168d60e8b8.png) | ![](https://user-images.githubusercontent.com/20679825/236821838-46bf311c-001c-4d15-addd-ba07eaae4ef9.png) |
| ![](https://github.com/misskey-dev/buraha/assets/20679825/e22570f0-9535-4d30-b135-20c889038b55) | ![](https://github.com/misskey-dev/buraha/assets/20679825/688d83de-2e0f-414f-88db-53e39d19e602) |
| ![](https://github.com/misskey-dev/buraha/assets/20679825/360f9093-87d0-48af-abbe-bb37e1ef73e4) | ![](https://github.com/misskey-dev/buraha/assets/20679825/23d84235-a495-4363-92a2-0c0b81d1e91c) |


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
