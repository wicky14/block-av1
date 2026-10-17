# Block AV1

A tiny Manifest V3 extension that makes the browser report **AV1** as unsupported,
so sites such as YouTube fall back to **VP9** or **H.264** — codecs that many older
GPUs *can* decode in hardware.

## Why

Many pre-2020 integrated GPUs (Intel Kaby Lake / UHD 620, for example) have hardware
decoding for H.264 and VP9 but **not** for AV1. When YouTube sends AV1, the CPU has to
decode it in software, which shows up as high CPU load, stutter on high resolutions,
and extra heat.

Measured on an Intel i5-8250U + Intel UHD 620 (Chromium on Wayland, bitrates within
~1.6x of each other). Median of 3 runs, browser CPU (all processes), playback verified
as realtime with 0 dropped frames:

| Codec | CPU, normal | CPU, hardware decode forced off | Ratio | Verdict |
|---|---|---|---|---|
| VP9 1080p (5.3 Mbps) | **45%** | 105% | 2.3x | hardware decode works |
| VP9 1440p (6.1 Mbps) | **39%** | 140% | 3.6x | hardware decode works — and costs no more than 1080p |
| H.264 1080p (8.6 Mbps) | **44%** | 90% | 2.0x | hardware decode works |
| **AV1 1080p (8.6 Mbps)** | **97%** | 98% | 1.0x | **no hardware decode at all** |

"Hardware decode forced off" is `--disable-accelerated-video-decode`; the ratio between
the two columns is the proof of whether a hardware path exists.

Disabling AV1 means the player picks VP9 instead of burning ~97% of a core on AV1
software decoding — roughly halving CPU use at the same resolution. Note the UHD 620
handles VP9 **1440p** more cheaply than VP9 1080p here, so blocking AV1 keeps
above-1080p playback comfortable instead of giving it up.

Blocking **only** AV1 matters: YouTube does not serve H.264 above 1080p, so forcing
H.264 (what `h264ify` does) would cap you at 1080p. VP9 is available all the way up to
4K, so blocking AV1 alone keeps 1440p/4K reachable.

## What it patches

Only MIME types containing `av01` are affected:

- `HTMLMediaElement.prototype.canPlayType`
- `HTMLVideoElement.prototype.canPlayType`
- `MediaSource.isTypeSupported`
- `navigator.mediaCapabilities.decodingInfo`

VP9 (`vp09` / `vp9`) and H.264 (`avc1`) are left untouched. Nothing is sent anywhere;
there is no background script and no network access.

## Install

Requires Chrome/Chromium/Brave/Edge **111 or newer** (for `world: "MAIN"` content scripts).

### Option A — Load unpacked (any OS)

1. Clone this repository somewhere permanent:
   ```sh
   git clone https://github.com/wicky14/block-av1.git
   ```
2. Open `chrome://extensions` (or `brave://extensions`).
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the cloned `block-av1` folder.
5. Restart the browser.

Chromium will show a "developer mode extensions" warning on startup. That is expected
for any unpacked extension.

### Option B — via a Chromium flags file (Linux)

If you already load unpacked extensions from a flags file, just append this folder to
the existing `--load-extension` list. Do **not** add a second `--load-extension` line —
Chromium keeps only the last one.

```
# ~/.config/chromium-flags.conf  (or brave-origin-flags.conf, etc.)
--load-extension=/path/to/other-ext,/home/you/Projects/block-av1
```

Then restart the browser.

### Option C — Chrome Web Store

Not published. Publishing requires a developer account and review, and the original
extension this is derived from was removed from the store when Manifest V2 was retired.
Use option A or B.

## Verify it is working

1. Play any YouTube video.
2. Right-click the video → **Stats for nerds**.
3. Look at the **Codecs** line:
   - `vp09...` or `avc1...` → working.
   - `av01...` → the extension is not loaded.

To confirm the patch itself is live, open DevTools on a YouTube tab and run:

```js
window.__blockAV1Active            // "1.0.0" if the script ran
MediaSource.isTypeSupported('video/mp4; codecs="av01.0.05M.08"')  // false
MediaSource.isTypeSupported('video/mp4; codecs="vp09.00.10.08"')  // true
```

## Uninstall

Remove the extension from `chrome://extensions`, or delete its entry from your
`--load-extension` flags file, then restart the browser.

## Other sites

The manifest matches `*.youtube.com`, `*.youtube-nocookie.com` and `*.youtu.be`.
Add your own entries to `content_scripts[0].matches` to cover other sites that serve
AV1 — note that some will then fall back to VP9, and a few may fail to play at all if
they have no non-AV1 source.

## Note for newer hardware

This extension is only useful on GPUs **without** AV1 hardware decoding. Intel Xe/Arc,
NVIDIA RTX 30-series and later, and AMD RDNA2/3 decode AV1 in hardware — on those,
forcing VP9 is a downgrade in compression efficiency and you should not use this.

## Credits and license

Ported to Manifest V3 from [Not yet, AV1](https://github.com/Shimmermare/NotYetAV1)
by Shimmermare, itself derived from [h264ify](https://github.com/erkserkserks/h264ify)
by erkserkserks.

MIT — see [LICENSE](LICENSE). Original copyright (c) 2015 erkserkserks is preserved.

---

## Ringkasan (Bahasa Indonesia)

Ekstensi kecil (Manifest V3) yang membuat browser melaporkan **AV1** sebagai tidak
didukung, sehingga YouTube memakai **VP9**/**H.264** yang punya hardware decode di GPU
lama seperti Intel UHD 620. Hanya AV1 yang diblokir, jadi resolusi 1440p/4K tetap bisa.

Pasang: `chrome://extensions` → aktifkan **Developer mode** → **Load unpacked** →
pilih folder hasil clone. Cek hasilnya lewat **Stats for nerds**; kodek yang diinginkan
adalah `vp09`, bukan `av01`. Jangan dipakai di GPU baru (Xe/Arc, RTX 30xx+, RDNA2/3)
karena GPU tersebut sudah punya decode AV1 berbasis hardware.
