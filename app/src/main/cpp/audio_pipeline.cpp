#include <jni.h>
#include <algorithm>
#include <cstdint>

namespace {
constexpr int kMaxSampleRate = 192000;
constexpr int kNativeDepth = 24;
int negotiatedSampleRate = 48000;
int negotiatedBitDepth = 16;

int nearestSupportedRate(int requested) {
    constexpr int supported[] = {44100, 48000, 88200, 96000, 176400, 192000};
    int chosen = supported[0];
    for (int rate : supported) {
        if (rate <= requested && rate >= chosen) chosen = rate;
    }
    return chosen;
}
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_hi360_stream_AudioEngine_configure(JNIEnv*, jobject, jint sampleRate, jint bitDepth) {
    if (sampleRate <= 0 || bitDepth <= 0) return JNI_FALSE;
    negotiatedSampleRate = nearestSupportedRate(std::min(sampleRate, kMaxSampleRate));
    negotiatedBitDepth = std::min(bitDepth, kNativeDepth);
    return JNI_TRUE;
}

extern "C" JNIEXPORT jint JNICALL
Java_com_hi360_stream_AudioEngine_sampleRate(JNIEnv*, jobject) { return negotiatedSampleRate; }

extern "C" JNIEXPORT jint JNICALL
Java_com_hi360_stream_AudioEngine_bitDepth(JNIEnv*, jobject) { return negotiatedBitDepth; }
