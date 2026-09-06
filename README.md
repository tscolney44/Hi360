# hi360

A native Android music-streaming client concept with a Kotlin/Jetpack Compose interface and a C++20 JNI audio-format negotiation core. The app includes a polished discovery screen, mini-player, and quality picker spanning standard playback through **192 kHz / 24-bit** Hi-Res Lossless.

## Architecture

- **Kotlin UI:** A single Compose state-driven experience makes quality selection and playback controls responsive.
- **C++ audio core:** `audio_pipeline.cpp` safely caps streams at 192 kHz and 24-bit, then negotiates against standard high-resolution PCM sample rates (44.1 / 48 / 88.2 / 96 / 176.4 / 192 kHz).
- **JNI boundary:** `AudioEngine` isolates native calls from UI state so a future decoder, ring buffer, OpenSL ES/AAudio output, DRM, and adaptive streaming layer can be added without rewriting the screen.

## Build

Open the project in Android Studio (Ladybug or newer), install Android SDK 35 plus NDK/CMake, then run the `app` configuration.
