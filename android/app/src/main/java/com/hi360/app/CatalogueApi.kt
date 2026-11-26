package com.hi360.app

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class HiTrack(val id:String,val title:String,val artist:String,val cover:String,val qualities:Map<String,String>)
class CatalogueApi(private val endpoint:String) {
    fun read():List<HiTrack> {
        require(endpoint.startsWith("https://")) { "Use a secure HTTPS Hi360 API URL." }
        val conn = (URL(endpoint).openConnection() as HttpURLConnection).apply { requestMethod="GET"; connectTimeout=15000; readTimeout=20000 }
        try {
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            val json = JSONObject(body)
            if (!json.optBoolean("ok")) error(json.optString("error","Deltabase error"))
            val rows = json.optJSONArray("tracks") ?: return emptyList()
            val out = mutableListOf<HiTrack>()
            for (i in 0 until rows.length()) {
                val r = rows.getJSONArray(i)
                fun s(n:Int)=if(n<r.length()) r.optString(n,"") else ""
                val q = linkedMapOf("aac96" to s(12),"aac256" to s(13),"flac16" to s(14),"flac24" to s(15)).filterValues { it.isNotBlank() }
                if(s(1).isNotBlank()) out += HiTrack(s(0),s(1),s(2),s(6),q)
            }
            return out
        } finally { conn.disconnect() }
    }
}