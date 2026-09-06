package com.hi360.stream

/** JNI boundary for the latency-sensitive format negotiation path. */
object AudioEngine {
    init { System.loadLibrary("hi360_audio") }

    external fun configure(sampleRate: Int, bitDepth: Int): Boolean
    external fun sampleRate(): Int
    external fun bitDepth(): Int

    fun negotiate(requested: StreamQuality): StreamQuality {
        configure(requested.sampleRate, requested.bitDepth)
        return requested.copy(sampleRate = sampleRate(), bitDepth = bitDepth())
    }
}

data class StreamQuality(val label: String, val sampleRate: Int, val bitDepth: Int) {
    val detail get() = "${sampleRate / 1000f} kHz · $bitDepth-bit"
}
