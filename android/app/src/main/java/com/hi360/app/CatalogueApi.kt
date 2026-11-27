package com.hi360.app

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL

data class HiTrack(
    val id: String, val title: String, val artist: String, val featured: String, val album: String,
    val albumArtist: String, val cover: String, val trackNo: Int, val year: Int, val genre: String,
    val durationSec: Int, val qualities: Map<String, String>, val video: String, val dateAdded: String,
) {
    val displayArtist get() = if (featured.isBlank()) artist else "$artist feat. $featured"
}

object Tiers {
    val order = listOf("aac96", "aac256", "flac16", "flac24")
    fun label(k: String) = when (k) { "aac96" -> "AAC · 96 kbps"; "aac256" -> "AAC · 256 kbps"; "flac16" -> "FLAC · 16-bit CD"; "flac24" -> "FLAC · 24-bit Hi-Res"; else -> k }
    /** Wanted tier, then lower tiers (descending), then higher ones. */
    fun pick(t: HiTrack, want: String): String? {
        val i = order.indexOf(want).coerceAtLeast(0)
        return (listOf(order[i]) + order.subList(0, i).reversed() + order.subList(i + 1, order.size)).firstOrNull { t.qualities.containsKey(it) }
    }
}

object CatalogueParser {
    private val cols = listOf("ID", "Title", "Artist", "Featured Artists", "Album", "Album Artist", "Cover Art URL", "Track No", "Disc No", "Year", "Genre", "Duration (sec)", "AAC 96 kbps URL", "AAC 256 kbps URL", "FLAC 16-bit (CD) URL", "FLAC 24-bit URL", "Video URL", "Date Added")

    fun https(u: String?): String = try { val s = (u ?: "").trim(); if (URI(s).scheme.equals("https", true)) s else "" } catch (e: Exception) { "" }
    private fun int(s: String) = s.filter { it.isDigit() || it == '.' }.toDoubleOrNull()?.toInt() ?: 0

    /** Accepts the documented 18-column arrays or objects keyed by header name. Rows with no HTTPS audio URL are dropped. */
    fun parse(body: String): List<HiTrack> {
        val json = JSONObject(body)
        if (!json.optBoolean("ok")) throw IllegalStateException(json.optString("error", "Catalogue returned an error"))
        val rows = json.optJSONArray("tracks") ?: return emptyList()
        val seen = HashSet<String>(); val out = ArrayList<HiTrack>()
        for (i in 0 until rows.length()) {
            val row = rows.opt(i)
            val f: (Int) -> String = when (row) {
                is JSONArray -> { n -> if (n < row.length()) row.optString(n, "").trim() else "" }
                is JSONObject -> { n -> row.optString(cols[n], "").trim() }
                else -> continue
            }
            val title = f(1); if (title.isBlank()) continue
            val q = linkedMapOf<String, String>()
            listOf("aac96" to 12, "aac256" to 13, "flac16" to 14, "flac24" to 15).forEach { (k, c) -> https(f(c)).takeIf { it.isNotEmpty() }?.let { q[k] = it } }
            if (q.isEmpty()) continue
            val artist = f(2).ifBlank { "Unknown artist" }
            val id = f(0).ifBlank { "g" + (title + artist + f(4)).hashCode().toUInt().toString(36) }
            if (!seen.add(id)) continue
            out += HiTrack(id, title, artist, f(3), f(4), f(5).ifBlank { artist }, https(f(6)), int(f(7)), int(f(9)), f(10), int(f(11)), q, https(f(16)), f(17))
        }
        return out
    }
}

class CatalogueApi(private val endpoint: String) {
    /** Blocking; call from Dispatchers.IO. Retries with backoff. Returns the raw JSON body (validated by CatalogueParser). */
    fun readRaw(tries: Int = 3): String {
        require(endpoint.startsWith("https://")) { "Use a secure HTTPS Hi360 API URL (Settings)." }
        var last: Exception? = null
        repeat(tries) { attempt ->
            val conn = (URL(endpoint).openConnection() as HttpURLConnection).apply { requestMethod = "GET"; useCaches = false; setRequestProperty("Cache-Control", "no-cache"); connectTimeout = 15000; readTimeout = 20000 }
            try {
                if (conn.responseCode !in 200..299) error("Catalogue unavailable (${conn.responseCode})")
                return conn.inputStream.bufferedReader().use { it.readText() }
            } catch (e: Exception) { last = e; if (attempt < tries - 1) Thread.sleep(500L shl attempt) } finally { conn.disconnect() }
        }
        throw last ?: IllegalStateException("Catalogue unavailable")
    }
}
