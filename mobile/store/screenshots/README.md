# Store screenshots

The `ios-6.3/` images were recaptured from the ratings-only EAS iOS Simulator
build `c56f4643-0742-42c2-ab7d-30f2faa9996a` on an iPhone 17 Pro simulator.

- Resolution: 1206 × 2622 portrait.
- Format: JPEG without an alpha channel.
- Status bar: fixed at 9:41 with full signal and battery for consistency.
- Content: live production directory data from `api.tecnicosenrd.com`; written
  review content is not downloaded or shown.

The filtered-search image uses the same simulator app and release bundle with
the reachable `Carpintero` filter initialized for a deterministic capture. It
does not alter or fabricate technician, location, or rating data. The unmodified
EAS build was restored after capture.

Apple accepts this resolution for 6.3-inch iPhone screenshots. Google Play can
use the Android captures below, which match its phone screenshot constraints.

The `ios-6.5/` images are centered, aspect-preserving crops of the same captures
at 1242 × 2688. They populate Apple's required 6.5-inch display group without
changing the screens or their data.

## Android phone

The `android-phone/` images were recaptured on an Android 16 phone emulator from
the signed EAS preview shell with the exact ratings-only release JavaScript from
commit `01aca21` embedded for screenshot QA.

- Resolution: 1080 × 1920 portrait (9:16).
- Format: JPEG without an alpha channel.
- Content: the installed `com.tecnicosenrd.app` APK using live production data
  from `api.tecnicosenrd.com`; no technician or rating data was fabricated.
- Screens: directory, technician profile, filtered search, and account/privacy.
