package com.hi360.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class CatalogueParserTest {
    private fun row(vararg kv: Pair<Int, String>): String {
        val a = Array(18) { "" }; kv.forEach { (i, v) -> a[i] = v }
        return a.joinToString(",", "[", "]") { "\"$it\"" }
    }
    @Test fun dropsRowsWithoutHttpsAudio() {
        val body = """{"ok":true,"tracks":[${row(0 to "1", 1 to "A", 13 to "http://x/a.m4a")},${row(0 to "2", 1 to "B", 13 to "https://x/b.m4a")}]}"""
        assertEquals(listOf("2"), CatalogueParser.parse(body).map { it.id })
    }
    @Test fun qualityFallbackPrefersLowerThenHigher() {
        val t = CatalogueParser.parse("""{"ok":true,"tracks":[${row(0 to "1", 1 to "A", 12 to "https://x/1", 15 to "https://x/4")}]}""").first()
        assertEquals("aac96", Tiers.pick(t, "flac16")); assertNull(Tiers.pick(t.copy(qualities = emptyMap()), "aac96"))
    }
    @Test(expected = IllegalStateException::class) fun surfacesServerError() { CatalogueParser.parse("""{"ok":false,"error":"bad token"}""") }
}
